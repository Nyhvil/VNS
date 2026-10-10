export type EmailParsesRow = {
  id: string;
  scan_id: string;
  subject: string | null;
  from_email: string | null;
  from_domain: string | null;
  to_email: string | null;
  reply_to: string | null;
  body_text: string | null;
  body_html: string | null;
  spf_status: string | null;
  dkim_status: string | null;
  dmarc_status: string | null;
  return_path: string | null;
  message_id: string | null;
  mailer: string | null;
  raw_headers: Record<string, unknown> | null;
  parsed_at: Date;
};
