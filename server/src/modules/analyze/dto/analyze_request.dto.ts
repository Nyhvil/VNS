import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export enum AnalyzeInputType {
  EMAIL_TEXT = 'email_text',
  PLAIN_TEXT = 'plain_text',
  EML_FILE = 'eml_file',
  IMAGE = 'image',
}

export class AnalyzeRequestDto {
  @ApiProperty({
    description: 'Scan request ID to analyze',
    example: 'scn-550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @Matches(/^scn-[0-9a-f-]{36}$/, { message: 'Invalid scan_id format' })
  scan_id!: string;

  @ApiProperty({
    enum: AnalyzeInputType,
    example: AnalyzeInputType.EMAIL_TEXT,
  })
  @IsEnum(AnalyzeInputType)
  input_type!: AnalyzeInputType;

  @ApiProperty({
    description: 'Raw content to analyze (base64 for images)',
    example: 'From: attacker@evil.com\nSubject: Urgent...',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({
    description: 'Optional metadata',
    example: { source: 'upload' },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
