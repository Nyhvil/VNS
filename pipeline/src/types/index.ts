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
  /** Combined ordering score from the reranker, 0-1. */
  rerank_score?: number;
  /** Where the sample came from: "curated" (seeded by the team) or "pipeline_auto" (learned from analysed content). */
  source?: string;
}

export interface Evidence {
  headers: Record<string, string>;
  urls: NormalizedUrl[];
  keywords: string[];
  rag_matches: RagMatch[];
  /** Results of checking each URL against the Vietnamese knowledge base. */
  url_checks?: UrlSafetyResult[];
  /** Verified Vietnamese organisations mentioned in the content. */
  entities?: EntityMention[];
  /** Common Vietnamese scam patterns the content matches. */
  scam_patterns?: ScamPatternMatch[];
  /** Text decoded from QR codes found in an image. */
  qr_codes?: string[];
}

// ============================================================
// Knowledge base (Vietnamese organisations, domains, scam patterns)
// ============================================================

export interface UrlSafetyResult {
  url: string;
  hostname: string;
  official: boolean;
  suspicious: boolean;
  flags: {
    invalid: boolean;
    suspicious_tld: boolean;
    impersonated_brands: string[];
    shortener: boolean;
    ip_address: boolean;
    many_subdomains: boolean;
    /** Words such as "xacminh", "hoantien" inside an unofficial domain. */
    deceptive_words?: string[];
  };
  /** Human-readable reasons, in Vietnamese. */
  reasons: string[];
}

export interface EntityMention {
  category: string;
  found: string[];
  verified: boolean;
}

export interface ScamPatternMatch {
  id: string;
  name: string;
  description: string;
  risk_weight: number;
  matched_keywords: string[];
}

export interface KnowledgeFindings {
  urls: UrlSafetyResult[];
  entities: EntityMention[];
  patterns: ScamPatternMatch[];
}

// ============================================================
// Scoring breakdown
// ============================================================

export type LayerId = 'rag' | 'rule' | 'header' | 'image' | 'llm';

export interface LayerScore {
  id: LayerId;
  /** Display name, in Vietnamese. */
  label: string;
  /** Weight of the layer in the formula (0-1). */
  weight: number;
  /** Score of the layer, 0-100. */
  score: number;
  /** Whether the layer had a signal for this content and took part in the formula. */
  applied: boolean;
}

export type AnalysisPath = 'fast_ml' | 'deep';

/** Three-level verdict shown to end users. */
export type VnsRiskLevel = 'SAFE' | 'SUSPICIOUS' | 'SCAM';

export interface VnsVerdict {
  scam_percent: number;
  risk_level: VnsRiskLevel;
  explanation: string;
  dangerous_phrases: string[];
  advice: string;
  verification_summary: string;
  extracted_text?: string;
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
  /** Which route the content took: straight from the ML classifier, or the full analysis. */
  analysis_path?: AnalysisPath;
  /** Per-layer scores behind risk_score. */
  layers?: LayerScore[];
  /** Score of the weighted formula before the LLM safety floor. */
  formula_score?: number;
  /** True when the final score was raised to the LLM's own score. */
  llm_floor_applied?: boolean;
  /** Result of the PhoBERT / DistilBERT classifier, when the ML service is configured. */
  ml?: MlResult;
  /** The verdict in the shape the VNS web app shows. */
  vns?: VnsVerdict;
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
  /** Text decoded from QR codes in the source image. */
  qr_codes?: string[];
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
  /** Findings from the Vietnamese knowledge base. */
  knowledge?: KnowledgeFindings;
  /** Behavioural scam signals (money request, pressure, code request...). */
  signals?: ScamSignalFinding[];
  /** The content is a one-time code sent by a real service (see scam-signals.ts). */
  one_time_code_notice?: boolean;
}

export interface ScamSignalFinding {
  id: string;
  label: string;
  matched: string[];
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
  /** True when the model answered with a usable verdict. */
  succeeded?: boolean;
  dangerous_phrases?: string[];
  advice?: string;
  verification_summary?: string;
}

export interface MlResult {
  /** False when the ML service is not configured or did not answer. */
  available: boolean;
  label: 'scam' | 'safe' | null;
  /** Confidence of the predicted label, 0-1. */
  confidence: number;
  /** Probability that the content is a scam, 0-1. */
  scam_probability: number;
  /** Model that produced the prediction, e.g. "phobert" or "distilbert". */
  model: string | null;
  language: string | null;
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
  /** Per-layer breakdown behind risk_score. */
  layers?: LayerScore[];
  /** Score of the weighted formula before the LLM safety floor. */
  formula_score?: number;
  llm_floor_applied?: boolean;
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
