import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateNormalizedInputsDto {
  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  @Matches(/^scn-[0-9a-f-]{36}$/)
  scan_id!: string;

  @ApiProperty({ example: 'Please verify your account at https://example.com' })
  @IsString()
  normalized_text!: string;

  @ApiPropertyOptional({ example: 'vi' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string;

  @ApiPropertyOptional({ example: ['https://example.com/login'] })
  @IsOptional()
  extracted_urls?: unknown;

  @ApiPropertyOptional({ example: ['example.com'] })
  @IsOptional()
  extracted_domains?: unknown;

  @ApiPropertyOptional({ example: ['verify', 'login'] })
  @IsOptional()
  extracted_keywords?: unknown;

  @ApiPropertyOptional({ example: 'Text extracted from screenshot' })
  @IsOptional()
  @IsString()
  ocr_text?: string;

  @ApiPropertyOptional({ example: { source: 'pipeline' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
