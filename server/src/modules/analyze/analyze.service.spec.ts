import axios from 'axios';
import { Pool } from 'pg';
import { AnalyzeService } from './analyze.service';
import { PipelineAnalyzeResponse } from './interfaces/analyze.interface';

jest.mock('axios');
// uuid ships as an ES module, which this Jest setup does not transform.
jest.mock('uuid', () => ({
  v4: () => '550e8400-e29b-41d4-a716-446655440000',
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

const JOB_ID = 'job-550e8400-e29b-41d4-a716-446655440000';
const SCAN_ID = 'scn-550e8400-e29b-41d4-a716-446655440000';

type SavedResult = { risk_score: unknown; risk_level: unknown; raw: any };

function createService(): { service: AnalyzeService; saved: SavedResult[] } {
  const saved: SavedResult[] = [];

  const query = jest.fn(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('INSERT INTO analyze_results')) {
      saved.push({
        risk_score: params[2],
        risk_level: params[3],
        raw: JSON.parse(String(params[8])),
      });
      return {
        rows: [
          {
            id: 'ares-1',
            job_id: params[0],
            scan_id: params[1],
            risk_score: params[2],
            risk_level: params[3],
            category: params[4],
          },
        ],
      };
    }
    return { rows: [{ id: JOB_ID, scan_id: SCAN_ID, status: 'success' }] };
  });

  const service = new AnalyzeService({ query } as unknown as Pool);
  return { service, saved };
}

function pipelineResponse(
  overrides: Partial<PipelineAnalyzeResponse>,
): PipelineAnalyzeResponse {
  return {
    job_id: '550e8400-e29b-41d4-a716-446655440000',
    status: 'completed',
    risk_score: 0,
    risk_level: 'low',
    category: 'safe',
    findings: [],
    evidence: {},
    recommendation: '',
    ...overrides,
  };
}

async function analyzeWith(response: PipelineAnalyzeResponse) {
  const { service, saved } = createService();
  mockedAxios.post.mockResolvedValue({ data: response });

  const output = await service.analyze({
    scan_id: SCAN_ID,
    input_type: 'plain_text',
    content: 'hello',
  } as never);

  return { output, saved: saved[0] };
}

describe('AnalyzeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores the re-weighted risk score as a whole number', async () => {
    // (0.4*100 + 0.2*80 + 0.15*40 + 0.1*12) / 0.85 = 74.35...
    const { saved } = await analyzeWith(
      pipelineResponse({
        risk_score: 64,
        risk_level: 'high',
        category: 'phishing',
        rag_score: 100,
        rule_score: 80,
        header_score: 40,
        image_score: 12,
      }),
    );

    expect(saved.risk_score).toBe(74);
    expect(Number.isInteger(saved.risk_score)).toBe(true);
    expect(saved.raw.scoring.weighted_risk_score).toBeCloseTo(74.35, 2);
    expect(saved.raw.scoring.final_risk_score).toBe(74);
  });

  it('keeps the stored level consistent with the stored score', async () => {
    // Pipeline says 55 / medium; the server weights give (40 + 20) / 0.85 = 70.6
    const { saved } = await analyzeWith(
      pipelineResponse({
        risk_score: 55,
        risk_level: 'medium',
        category: 'phishing',
        rag_score: 100,
        rule_score: 100,
        header_score: 0,
        image_score: 0,
      }),
    );

    expect(saved.risk_score).toBe(71);
    expect(saved.risk_level).toBe('high');
  });

  it.each([
    [0, 'low'],
    [29, 'low'],
    [30, 'medium'],
    [59, 'medium'],
    [60, 'high'],
    [84, 'high'],
    [85, 'critical'],
    [100, 'critical'],
  ])('maps a score of %i to the %s level', async (score, level) => {
    const { saved } = await analyzeWith(
      pipelineResponse({
        rag_score: score,
        rule_score: score,
        header_score: score,
        image_score: score,
        llm_score: score,
      }),
    );

    expect(saved.risk_score).toBe(score);
    expect(saved.risk_level).toBe(level);
  });

  it('uses the pipeline score and level when there are no component scores', async () => {
    const { saved } = await analyzeWith(
      pipelineResponse({
        risk_score: 0,
        risk_level: 'low',
        category: 'unreadable_image',
      }),
    );

    expect(saved.risk_score).toBe(0);
    expect(saved.risk_level).toBe('low');
    expect(saved.raw.scoring.mode).toBe('pipeline_default');
  });
});
