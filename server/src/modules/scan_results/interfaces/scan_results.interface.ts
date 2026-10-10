export enum VerdictType {
  SAFE = 'safe',
  SUSPICIOUS = 'suspicious',
  PHISHING = 'phishing',
}

export type ScanResultsRow = {
  id: string;
  scan_id: string;
  verdict: VerdictType;
  risk_percent: string | number;
  rag_score: string | number;
  rule_score: string | number;
  header_score: string | number;
  image_score: string | number;
  llm_score: string | number;
  formula: unknown;
  summary: string | null;
  header_explanation: string | null;
  content_explanation: string | null;
  link_explanation: string | null;
  recommendation: string | null;
  evidence: unknown;
  created_at: Date;
};
