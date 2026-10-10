import { UsersRow } from '../interfaces/users.interface';

export type CreateUsersModel = Pick<
  UsersRow,
  'email' | 'name' | 'avatar_url' | 'role'
>;

export type UpdateUsersModel = Partial<
  Pick<UsersRow, 'email' | 'name' | 'avatar_url' | 'role' | 'is_active'>
>;
