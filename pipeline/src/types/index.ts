// ============================================================
// Input / Request Types
// ============================================================

export type InputType = 'email_text' | 'plain_text' | 'eml_file' | 'image';

export interface AnalysisRequest {
  job_id: string;        // UUID v4
  type: InputType;
  content: string;       // raw content (base64 for image)
  metadata?: Record<string, unknown>;
}

// ============================================================
// Output / Response Types
// ============================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Category = 'phishing' | 'spam' | 'suspicious' | 'safe' | 'unreadable_image';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Finding {
  rule_id: string;
  severity: Severity;
  description: string;
  evidence: Record<string, unknown>;
}

export interface NormalizedUrl {
  original: string;
  normalized: string;    // lowercase scheme + host
  is_ip_based: boolean;
  is_shortener: boolean;
}

export interface RagMatch {
  id: string;
  similarity: number;    // 0.0–1.0
  label: string;
  snippet: string;
}

export interface Evidence {
  headers: Record<string, string>;
  urls: NormalizedUrl[];
  keywords: string[];
  rag_matches: RagMatch[];
}

export interface AnalysisResponse {
  job_id: string;
  status: 'completed';
  risk_score: number;    // integer 0–100
  risk_level: RiskLevel;
  category: Category;
  findings: Finding[];
  evidence: Evidence;
  recommendation: string;
  rag_score?: number;
  rule_score?: number;
  header_score?: number;
  image_score?: number;
  llm_score?: number;
}

export interface HealthResponse {
  status: 'ok' | 'starting';
  timestamp: string;     // ISO 8601
}

// ============================================================
// Internal / Parsed Content Types
// ============================================================

export interface ContentMetadata {
  app_source?: string;
  participants?: string[];
  timestamp?: string | null;
}

export interface ParsedEmail {
  sender: string | null;
  reply_to: string | null;
  subject: string | null;
  body: string;
  urls: string[];
  attachments: string[];
  headers: Record<string, string>;
  spf_result: 'pass' | 'fail' | 'none' | null;
  dkim_result: 'pass' | 'fail' | 'none' | null;
  originating_ip: string | null;
  metadata?: ContentMetadata;
}

export interface ParsedText {
  body: string;
  urls: string[];
  metadata?: ContentMetadata;
}

export type ParsedContent = ParsedEmail | ParsedText;

// Type guard
export function isParsedEmail(content: ParsedContent): content is ParsedEmail {
  return 'sender' in content;
}

// ============================================================
// Feature Extraction Types
// ============================================================

export interface FeatureSet {
  sender_domain: string | null;
  reply_to_domain: string | null;
  urls: NormalizedUrl[];
  suspicious_keywords: string[];
  domain_mismatch: boolean;
  spf_result: 'pass' | 'fail' | 'none' | null;
  dkim_result: 'pass' | 'fail' | 'none' | null;
}

// ============================================================
// Detection Layer Result Types
// ============================================================

export interface RuleResult {
  violations: Finding[];
  score: number;         // 0.0–100.0
}

export interface RagResult {
  matches: RagMatch[];
  top_score: number;     // 0.0–1.0
  score: number;         // 0.0–100.0 (normalized)
}

export interface LlmResult {
  explanation: string;
  score: number;         // 0.0–100.0
  enabled: boolean;
}

export interface DetectionResults {
  rule: RuleResult;
  rag: RagResult;
  llm: LlmResult;
  header_score: number;  // 0.0–100.0
  image_score: number;   // 0.0–100.0
}

export interface AggregatedScore {
  risk_score: number;    // integer 0–100
  risk_level: RiskLevel;
  category: Category;
}

// ============================================================
// OCR Types
// ============================================================

export interface OcrResult {
  text: string;
  confidence: number;    // 0–100
  success: boolean;
  metadata?: ContentMetadata;
}

// ============================================================
// RAG & VectorDB Types
// ============================================================

export interface Chunk {
  text: string;
  index: number;
  metadata?: ContentMetadata;
}

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

// ============================================================
// Error Types
// ============================================================

export interface PipelineError {
  code: string;
  message: string;
  job_id?: string;
}
