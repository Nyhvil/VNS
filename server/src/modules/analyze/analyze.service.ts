import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  AnalyzeJobResponseDto,
  AnalyzeResultResponseDto,
  AnalyzeFullResponseDto,
} from './dto/analyze_response.dto';
import { AnalyzeRequestDto } from './dto/analyze_request.dto';
import {
  AnalyzeJobRow,
  AnalyzeJobStatus,
  AnalyzeResultRow,
  PipelineAnalyzeRequest,
  PipelineAnalyzeResponse,
} from './interfaces/analyze.interface';

@Injectable()
export class AnalyzeService {
  private readonly logger = new Logger(AnalyzeService.name);

  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  // ============================================================
  // Main analyze flow
  // ============================================================

  async analyze(dto: AnalyzeRequestDto): Promise<AnalyzeFullResponseDto> {
    const pipelineUrl = process.env['PIPELINE_URL'] ?? 'http://localhost:3001';
    const pipelineApiKey = process.env['PIPELINE_API_KEY'] ?? '';
    const jobUuid = uuidv4();

    // 1. Create job record
    const job = await this.createJob({
      scan_id: dto.scan_id,
      job_id: jobUuid,
      input_type: dto.input_type,
      pipeline_url: pipelineUrl,
    });

    // 2. Update scan_request status → processing
    await this.updateScanStatus(dto.scan_id, 'processing');

    // 3. Call pipeline
    let pipelineResponse: PipelineAnalyzeResponse;
    try {
      await this.markJobProcessing(job.id);

      const payload: PipelineAnalyzeRequest = {
        job_id: jobUuid,
        type: dto.input_type,
        content: dto.content,
        metadata: dto.metadata,
      };

      const response = await axios.post<PipelineAnalyzeResponse>(
        `${pipelineUrl}/pipeline/analyze`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': pipelineApiKey,
          },
          timeout: 35_000, // slightly above pipeline's 30s timeout
        },
      );

      pipelineResponse = response.data;
    } catch (error) {
      const message = this.extractErrorMessage(error);
      this.logger.error(`Pipeline call failed for job ${jobUuid}: ${message}`);

      await this.markJobFailed(job.id, message);
      await this.updateScanStatus(dto.scan_id, 'failed', message);

      throw new InternalServerErrorException(
        `Pipeline analysis failed: ${message}`,
      );
    }

    // 4. Save result
    const result = await this.saveResult({
      job_id: job.id,
      scan_id: dto.scan_id,
      pipelineResponse,
    });

    // 5. Mark job success + update scan status
    await this.markJobSuccess(job.id);
    await this.updateScanStatus(dto.scan_id, 'success');

    // 6. Refresh job row
    const updatedJob = await this.findJobById(job.id);

    return {
      job: updatedJob,
      result,
    };
  }

  // ============================================================
  // Query methods
  // ============================================================

  async findJobById(id: string): Promise<AnalyzeJobResponseDto> {
    this.validateJobId(id);

    const result = await this.pool.query<AnalyzeJobRow>(
      `SELECT * FROM analyze_jobs WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    if (!row) throw new NotFoundException('Analyze job not found');

    return new AnalyzeJobResponseDto(row);
  }

  async findJobsByScanId(scanId: string): Promise<AnalyzeJobResponseDto[]> {
    this.validateScanId(scanId);

    const result = await this.pool.query<AnalyzeJobRow>(
      `SELECT * FROM analyze_jobs WHERE scan_id = $1 ORDER BY created_at DESC`,
      [scanId],
    );

    return result.rows.map((r) => new AnalyzeJobResponseDto(r));
  }

  async findResultByJobId(jobId: string): Promise<AnalyzeResultResponseDto> {
    this.validateJobId(jobId);

    const result = await this.pool.query<AnalyzeResultRow>(
      `SELECT * FROM analyze_results WHERE job_id = $1`,
      [jobId],
    );

    const row = result.rows[0];
    if (!row) throw new NotFoundException('Analyze result not found');

    return new AnalyzeResultResponseDto(row);
  }

  async findResultsByScanId(
    scanId: string,
  ): Promise<AnalyzeResultResponseDto[]> {
    this.validateScanId(scanId);

    const result = await this.pool.query<AnalyzeResultRow>(
      `SELECT * FROM analyze_results WHERE scan_id = $1 ORDER BY created_at DESC`,
      [scanId],
    );

    return result.rows.map((r) => new AnalyzeResultResponseDto(r));
  }

  async findAllJobs(page = 1, limit = 10) {
    const safePage = Math.max(Number(page), 1);
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<AnalyzeJobRow>(
        `SELECT * FROM analyze_jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [safeLimit, offset],
      ),
      this.pool.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM analyze_jobs`,
      ),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: dataResult.rows.map((r) => new AnalyzeJobResponseDto(r)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  // ============================================================
  // Private helpers
  // ============================================================

  private async createJob(params: {
    scan_id: string;
    job_id: string;
    input_type: string;
    pipeline_url: string;
  }): Promise<AnalyzeJobResponseDto> {
    const result = await this.pool.query<AnalyzeJobRow>(
      `
      INSERT INTO analyze_jobs (scan_id, job_id, status, input_type, pipeline_url)
      VALUES ($1, $2, $3::analyze_job_status, $4, $5)
      RETURNING *
      `,
      [
        params.scan_id,
        params.job_id,
        AnalyzeJobStatus.PENDING,
        params.input_type,
        params.pipeline_url,
      ],
    );

    return new AnalyzeJobResponseDto(result.rows[0]);
  }

  private async markJobProcessing(id: string): Promise<void> {
    await this.pool.query(
      `
      UPDATE analyze_jobs
      SET status = 'processing'::analyze_job_status, started_at = NOW(), updated_at = NOW()
      WHERE id = $1
      `,
      [id],
    );
  }

  private async markJobSuccess(id: string): Promise<void> {
    await this.pool.query(
      `
      UPDATE analyze_jobs
      SET status = 'success'::analyze_job_status, completed_at = NOW(), updated_at = NOW()
      WHERE id = $1
      `,
      [id],
    );
  }

  private async markJobFailed(id: string, errorMessage: string): Promise<void> {
    await this.pool.query(
      `
      UPDATE analyze_jobs
      SET status = 'failed'::analyze_job_status, error_message = $2, completed_at = NOW(), updated_at = NOW()
      WHERE id = $1
      `,
      [id, errorMessage],
    );
  }

  private async saveResult(params: {
    job_id: string;
    scan_id: string;
    pipelineResponse: PipelineAnalyzeResponse;
  }): Promise<AnalyzeResultResponseDto> {
    const r = params.pipelineResponse;
    const weighted = this.computeWeightedRiskScore(r);
    // analyze_results.risk_score is a SMALLINT (0-100), so the stored score
    // must be a whole number.
    const finalRiskScore = this.toStoredRiskScore(
      weighted.score ?? r.risk_score,
    );
    // The level shown to the user has to describe the score stored next to
    // it. When the server re-weights the score, re-derive the level too.
    const finalRiskLevel =
      weighted.score !== null
        ? this.mapRiskLevel(finalRiskScore)
        : r.risk_level;
    const enrichedRawResponse = {
      ...r,
      scoring: {
        mode: weighted.score !== null ? 'weighted' : 'pipeline_default',
        weights: weighted.weights,
        component_scores: weighted.componentScores,
        weighted_risk_score: weighted.score,
        final_risk_score: finalRiskScore,
        final_risk_level: finalRiskLevel,
      },
    };

    const result = await this.pool.query<AnalyzeResultRow>(
      `
      INSERT INTO analyze_results (
        job_id, scan_id, risk_score, risk_level, category,
        findings, evidence, recommendation, raw_response
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9::jsonb)
      RETURNING *
      `,
      [
        params.job_id,
        params.scan_id,
        finalRiskScore,
        finalRiskLevel,
        r.category,
        JSON.stringify(r.findings),
        JSON.stringify(r.evidence),
        r.recommendation,
        JSON.stringify(enrichedRawResponse),
      ],
    );

    return new AnalyzeResultResponseDto(result.rows[0]);
  }

  private async updateScanStatus(
    scanId: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.pool.query(
        `
        UPDATE scan_requests
        SET status = $1::scan_status, error_message = $2, updated_at = NOW()
        WHERE id = $3
        `,
        [status, errorMessage ?? null, scanId],
      );
    } catch (err) {
      // Non-fatal — log and continue
      this.logger.warn(`Failed to update scan_request status: ${String(err)}`);
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as Record<string, unknown> | undefined;
      const status = error.response?.status;
      const code = error.code;
      const candidates = [data?.['error'], data?.['message'], data?.['detail']];

      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
          const suffix = [
            status ? `status=${status}` : null,
            code ? `code=${code}` : null,
          ]
            .filter(Boolean)
            .join(', ');
          return suffix ? `${candidate.trim()} (${suffix})` : candidate.trim();
        }
      }

      const axiosMsg = error.message?.trim();
      if (axiosMsg) {
        const suffix = [
          status ? `status=${status}` : null,
          code ? `code=${code}` : null,
        ]
          .filter(Boolean)
          .join(', ');
        return suffix ? `${axiosMsg} (${suffix})` : axiosMsg;
      }

      return 'Unknown pipeline error (axios)';
    }
    if (error instanceof Error && error.message.trim())
      return error.message.trim();

    const fallback = String(error).trim();
    return fallback || 'Unknown pipeline error';
  }

  private computeWeightedRiskScore(response: PipelineAnalyzeResponse): {
    score: number | null;
    weights: Record<string, number>;
    componentScores: Record<string, number>;
  } {
    const weights = this.getRiskWeights();
    const componentScores = this.extractComponentScores(response);

    const weightEntries = Object.entries(weights).filter(
      ([key]) => componentScores[key] !== undefined,
    );

    if (weightEntries.length === 0) {
      return {
        score: null,
        weights,
        componentScores: componentScores as Record<string, number>,
      };
    }

    const weightSum = weightEntries.reduce((acc, [, w]) => acc + w, 0);
    if (weightSum <= 0) {
      return {
        score: null,
        weights,
        componentScores: componentScores as Record<string, number>,
      };
    }

    const weightedScore = weightEntries.reduce((acc, [key, w]) => {
      const component = componentScores[key] ?? 0;
      return acc + component * w;
    }, 0);

    const normalized = weightedScore / weightSum;
    const clamped = Math.max(0, Math.min(100, normalized));

    return {
      score: Number(clamped.toFixed(2)),
      weights,
      componentScores: componentScores as Record<string, number>,
    };
  }

  private toStoredRiskScore(score: number): number {
    const numeric = Number(score);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, Math.round(numeric)));
  }

  // Same thresholds as the pipeline (pipeline/src/scoring/risk-level-mapper.ts).
  private mapRiskLevel(score: number): string {
    if (score <= 29) return 'low';
    if (score <= 59) return 'medium';
    if (score <= 84) return 'high';
    return 'critical';
  }

  private getRiskWeights(): Record<string, number> {
    return {
      rag_score: this.readWeight('RAG_WEIGHT', 0.4),
      rule_score: this.readWeight('RULE_WEIGHT', 0.2),
      header_score: this.readWeight('HEADER_WEIGHT', 0.15),
      image_score: this.readWeight('IMAGE_WEIGHT', 0.1),
      llm_score: this.readWeight('LLM_WEIGHT', 0.15),
    };
  }

  private readWeight(envKey: string, fallback: number): number {
    const raw = process.env[envKey];
    if (!raw) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
  }

  private extractComponentScores(
    response: PipelineAnalyzeResponse,
  ): Record<string, number | undefined> {
    const evidence = response.evidence ?? {};
    return {
      rag_score: this.readNumericScore(
        response.rag_score,
        evidence['rag_score'],
      ),
      rule_score: this.readNumericScore(
        response.rule_score,
        evidence['rule_score'],
      ),
      header_score: this.readNumericScore(
        response.header_score,
        evidence['header_score'],
      ),
      image_score: this.readNumericScore(
        response.image_score,
        evidence['image_score'],
      ),
      llm_score: this.readNumericScore(
        response.llm_score,
        evidence['llm_score'],
      ),
    };
  }

  private readNumericScore(
    primary: unknown,
    secondary: unknown,
  ): number | undefined {
    if (primary === undefined && secondary === undefined) return undefined;
    if (primary === null && secondary === null) return undefined;

    const first = Number(primary);
    if (Number.isFinite(first)) return first;

    const second = Number(secondary);
    if (Number.isFinite(second)) return second;

    return undefined;
  }

  private validateJobId(id: string): void {
    if (!/^job-[0-9a-f-]{36}$/.test(id)) {
      throw new BadRequestException('Invalid analyze job id format');
    }
  }

  private validateScanId(id: string): void {
    if (!/^scn-[0-9a-f-]{36}$/.test(id)) {
      throw new BadRequestException('Invalid scan_id format');
    }
  }
}
