export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
}

export type UserAuthAccountsRow = {
  id: string;
  user_id: string;
  provider: AuthProvider;
  provider_user_id: string | null;
  password_hash: string | null;
  access_token: string | null;
  refresh_token: string | null;
  created_at: Date;
  updated_at: Date;
};
