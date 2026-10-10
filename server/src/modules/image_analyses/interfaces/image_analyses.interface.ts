export type ImageAnalysesRow = {
  id: string;
  scan_id: string;
  ocr_text: string | null;
  detected_text_blocks: unknown;
  detected_urls: unknown;
  has_qr_code: boolean;
  qr_content: string | null;
  image_score: string | number;
  metadata: unknown;
  created_at: Date;
};
