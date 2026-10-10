export type EmailAttachmentsRow = {
  id: string;
  email_parse_id: string;
  file_name: string | null;
  mime_type: string | null;
  file_size: string | number | null;
  file_url: string | null;
  extracted_text: string | null;
  has_image: boolean;
  has_macro: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date;
};
