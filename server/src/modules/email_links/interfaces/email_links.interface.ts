export type EmailLinksRow = {
  id: string;
  scan_id: string;
  email_parse_id: string | null;
  original_url: string;
  display_text: string | null;
  domain: string | null;
  is_shortened: boolean;
  is_suspicious: boolean;
  metadata: Record<string, unknown> | null;
  created_at: Date;
};
