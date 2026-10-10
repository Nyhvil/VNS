import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateEmailParsesDto {
  @ApiProperty({
    example: 'scn-550e8400-e29b-41d4-a716-446655440000',
  })
  @Matches(/^scn-[0-9a-f-]{36}$/)
  scan_id!: string;

  @ApiPropertyOptional({
    example: 'Urgent account verification required',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    example: 'security@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  from_email?: string;

  @ApiPropertyOptional({
    example: 'example.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  from_domain?: string;

  @ApiPropertyOptional({
    example: 'victim@mailguard.com',
  })
  @IsOptional()
  @IsString()
  to_email?: string;

  @ApiPropertyOptional({
    example: 'support@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  reply_to?: string;

  @ApiPropertyOptional({
    example: 'Please verify your account.',
  })
  @IsOptional()
  @IsString()
  body_text?: string;

  @ApiPropertyOptional({
    example: '<p>Please verify your account.</p>',
  })
  @IsOptional()
  @IsString()
  body_html?: string;

  @ApiPropertyOptional({
    example: 'pass',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  spf_status?: string;

  @ApiPropertyOptional({
    example: 'fail',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  dkim_status?: string;

  @ApiPropertyOptional({
    example: 'none',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  dmarc_status?: string;

  @ApiPropertyOptional({
    example: 'bounce@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  return_path?: string;

  @ApiPropertyOptional({
    example: '<message-id@example.com>',
  })
  @IsOptional()
  @IsString()
  message_id?: string;

  @ApiPropertyOptional({
    example: 'PHPMailer 6.9',
  })
  @IsOptional()
  @IsString()
  mailer?: string;

  @ApiPropertyOptional({
    example: {
      from: 'security@example.com',
      subject: 'Urgent account verification required',
    },
  })
  @IsOptional()
  @IsObject()
  raw_headers?: Record<string, unknown>;
}
