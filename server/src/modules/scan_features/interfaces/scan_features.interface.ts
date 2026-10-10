export type ScanFeaturesRow = {
  id: string;
  scan_id: string;
  sender_domain: string | null;
  sender_ip: string | null;
  has_urgent_keyword: boolean;
  has_verify_keyword: boolean;
  has_login_keyword: boolean;
  from_reply_to_mismatch: boolean;
  domain_spoofing: boolean;
  suspicious_link: boolean;
  failed_authentication: boolean;
  features: unknown;
  created_at: Date;
};
