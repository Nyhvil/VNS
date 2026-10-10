export type NormalizedInputsRow = {
  id: string;
  scan_id: string;
  normalized_text: string;
  language: string | null;
  extracted_urls: unknown;
  extracted_domains: unknown;
  extracted_keywords: unknown;
  ocr_text: string | null;
  metadata: unknown;
  created_at: Date;
};
