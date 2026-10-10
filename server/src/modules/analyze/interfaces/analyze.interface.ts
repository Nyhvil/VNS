// ============================================================
// Analyze Job
// ============================================================

export enum AnalyzeJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export type AnalyzeJobRow = {
  id: string;
  scan_id: string;
  job_id: string; // UUID sent to pipeline
  status: AnalyzeJobStatus;
  input_type: string;
  pipeline_url: string | null;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

// ============================================================
// Analyze Result
// ============================================================

export type AnalyzeResultRow = {
  id: string;
  job_id: string; // FK → analyze_jobs.id
  scan_id: string;
  risk_score: number;
  risk_level: string;
  category: string;
  findings: unknown; // JSONB
  evidence: unknown; // JSONB
  recommendation: string | null;
  raw_response: unknown; // JSONB — full pipeline response
  created_at: Date;
};

// ============================================================
// Pipeline API contract
// ============================================================

export interface PipelineAnalyzeRequest {
  job_id: string;
  type: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface PipelineAnalyzeResponse {
  job_id: string;
  status: string;
  risk_score: number;
  risk_level: string;
  category: string;
  findings: unknown[];
  evidence: Record<string, unknown>;
  recommendation: string;
  rag_score?: number;
  rule_score?: number;
  header_score?: number;
  image_score?: number;
  llm_score?: number;
}
