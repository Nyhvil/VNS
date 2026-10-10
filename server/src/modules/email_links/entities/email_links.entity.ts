import { EmailLinksRow } from '../interfaces/email_links.interface';

export type CreateEmailLinksModel = Pick<
  EmailLinksRow,
  'scan_id' | 'original_url'
> &
  Partial<
    Pick<
      EmailLinksRow,
      | 'email_parse_id'
      | 'display_text'
      | 'domain'
      | 'is_shortened'
      | 'is_suspicious'
      | 'metadata'
    >
  >;

export type UpdateEmailLinksModel = Partial<
  Pick<
    EmailLinksRow,
    | 'scan_id'
    | 'email_parse_id'
    | 'original_url'
    | 'display_text'
    | 'domain'
    | 'is_shortened'
    | 'is_suspicious'
    | 'metadata'
  >
>;
