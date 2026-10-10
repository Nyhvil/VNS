export type LlmAnalysesRow = {
  id: string;
  scan_id: string;
  provider: string | null;
  model: string | null;
  prompt: string | null;
  response: string | null;
  llm_score: string | number;
  explanation: string | null;
  created_at: Date;
};
