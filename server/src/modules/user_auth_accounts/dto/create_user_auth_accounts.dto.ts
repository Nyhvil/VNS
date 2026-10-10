import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { AuthProvider } from '../interfaces/user_auth_accounts.interface';

export class CreateUserAuthAccountsDto {
  @ApiProperty({
    example: 'usr-550e8400-e29b-41d4-a716-446655440000',
  })
  @Matches(/^usr-[0-9a-f-]{36}$/)
  user_id!: string;

  @ApiProperty({
    enum: AuthProvider,
    example: AuthProvider.LOCAL,
  })
  @IsEnum(AuthProvider)
  provider!: AuthProvider;

  @ApiPropertyOptional({
    example: 'user@mailguard.com',
  })
  @IsOptional()
  @IsString()
  provider_user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password_hash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  access_token?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
