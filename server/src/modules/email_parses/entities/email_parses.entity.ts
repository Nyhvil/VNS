import { EmailParsesRow } from '../interfaces/email_parses.interface';

export type CreateEmailParsesModel = Pick<EmailParsesRow, 'scan_id'> &
  Partial<
    Pick<
      EmailParsesRow,
      | 'subject'
      | 'from_email'
      | 'from_domain'
      | 'to_email'
      | 'reply_to'
      | 'body_text'
      | 'body_html'
      | 'spf_status'
      | 'dkim_status'
      | 'dmarc_status'
      | 'return_path'
      | 'message_id'
      | 'mailer'
      | 'raw_headers'
    >
  >;

export type UpdateEmailParsesModel = Partial<
  Pick<
    EmailParsesRow,
    | 'scan_id'
    | 'subject'
    | 'from_email'
    | 'from_domain'
    | 'to_email'
    | 'reply_to'
    | 'body_text'
    | 'body_html'
    | 'spf_status'
    | 'dkim_status'
    | 'dmarc_status'
    | 'return_path'
    | 'message_id'
    | 'mailer'
    | 'raw_headers'
  >
>;
