import { UserAuthAccountsRow } from '../interfaces/user_auth_accounts.interface';

export type CreateUserAuthAccountsModel = Pick<
  UserAuthAccountsRow,
  | 'user_id'
  | 'provider'
  | 'provider_user_id'
  | 'password_hash'
  | 'access_token'
  | 'refresh_token'
>;

export type UpdateUserAuthAccountsModel = Partial<CreateUserAuthAccountsModel>;
