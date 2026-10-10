import { EmailReceivedChainsRow } from '../interfaces/email_received_chains.interface';

export type CreateEmailReceivedChainsModel = Pick<
  EmailReceivedChainsRow,
  'email_parse_id' | 'chain_order'
> &
  Partial<
    Pick<
      EmailReceivedChainsRow,
      | 'ip_address'
      | 'mail_server'
      | 'received_from'
      | 'received_by'
      | 'received_at'
      | 'raw_line'
    >
  >;

export type UpdateEmailReceivedChainsModel = Partial<
  Pick<
    EmailReceivedChainsRow,
    | 'email_parse_id'
    | 'chain_order'
    | 'ip_address'
    | 'mail_server'
    | 'received_from'
    | 'received_by'
    | 'received_at'
    | 'raw_line'
  >
>;
