import { ApiProperty } from '@nestjs/swagger';
import {
  AuthProvider,
  UserAuthAccountsRow,
} from '../interfaces/user_auth_accounts.interface';

export class UserAuthAccountsResponseDto {
  @ApiProperty({ example: 'aut-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'usr-550e8400-e29b-41d4-a716-446655440000' })
  user_id!: string;

  @ApiProperty({ enum: AuthProvider, example: AuthProvider.LOCAL })
  provider!: AuthProvider;

  @ApiProperty({ example: 'user@mailguard.com', nullable: true })
  provider_user_id!: string | null;

  @ApiProperty({ example: null, nullable: true })
  access_token!: string | null;

  @ApiProperty({ example: null, nullable: true })
  refresh_token!: string | null;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  updated_at!: Date;

  constructor(account: UserAuthAccountsRow) {
    this.id = account.id;
    this.user_id = account.user_id;
    this.provider = account.provider;
    this.provider_user_id = account.provider_user_id;
    this.access_token = account.access_token;
    this.refresh_token = account.refresh_token;
    this.created_at = account.created_at;
    this.updated_at = account.updated_at;
  }
}
