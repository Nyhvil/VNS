import type { Request } from 'express';
import { UsersRow } from '../../users/interfaces/users.interface';

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

export type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

export type UserWithPasswordRow = UsersRow & {
  password_hash: string | null;
};
