export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export type UsersRow = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};
