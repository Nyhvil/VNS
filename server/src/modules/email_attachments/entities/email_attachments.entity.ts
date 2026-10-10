import { EmailAttachmentsRow } from '../interfaces/email_attachments.interface';

export type CreateEmailAttachmentsModel = Pick<
  EmailAttachmentsRow,
  'email_parse_id'
> &
  Partial<
    Pick<
      EmailAttachmentsRow,
      | 'file_name'
      | 'mime_type'
      | 'file_size'
      | 'file_url'
      | 'extracted_text'
      | 'has_image'
      | 'has_macro'
      | 'metadata'
    >
  >;

export type UpdateEmailAttachmentsModel = Partial<
  Pick<
    EmailAttachmentsRow,
    | 'email_parse_id'
    | 'file_name'
    | 'mime_type'
    | 'file_size'
    | 'file_url'
    | 'extracted_text'
    | 'has_image'
    | 'has_macro'
    | 'metadata'
  >
>;
