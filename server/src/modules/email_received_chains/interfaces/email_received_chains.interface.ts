export type EmailReceivedChainsRow = {
  id: string;
  email_parse_id: string;
  chain_order: number;
  ip_address: string | null;
  mail_server: string | null;
  received_from: string | null;
  received_by: string | null;
  received_at: Date | null;
  raw_line: string | null;
};
