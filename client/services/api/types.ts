// ============================================================
// API Error Types
// ============================================================

export type ApiErrorType =
  | 'network_error'
  | 'unauthorized'
  | 'not_found'
  | 'server_error'
  | 'validation_error';

export type ApiError = {
  type: ApiErrorType;
  message: string;
  status?: number;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

// ============================================================
// Server DTO types (matching server response shapes)
// ============================================================

export type AuthUserDto = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AuthResponseDto = {
  access_token: string;
  user: AuthUserDto;
};

export type ScanRequestsResponseDto = {
  id: string;
  user_id: string | null;
  input_type: string;
  status: string;
  original_text: string | null;
  original_url: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size: number | null;
  file_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalyzeJobResponseDto = {
  id: string;
  scan_id: string;
  job_id: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  input_type: string;
  pipeline_url: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalyzeResultResponseDto = {
  id: string;
  job_id: string;
  scan_id: string;
  risk_score: number;
  risk_level: string;
  category: string;
  findings: unknown[];
  evidence: Record<string, unknown>;
  recommendation: string | null;
  raw_response: unknown;
  created_at: string;
};

export type AnalyzeFullResponseDto = {
  job: AnalyzeJobResponseDto;
  result: AnalyzeResultResponseDto | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};
