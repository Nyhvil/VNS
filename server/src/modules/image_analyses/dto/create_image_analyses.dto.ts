import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
} from 'class-validator';

export class CreateImageAnalysesDto {
  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  @Matches(/^scn-[0-9a-f-]{36}$/)
  scan_id!: string;

  @ApiPropertyOptional({ example: 'Verify your account' })
  @IsOptional()
  @IsString()
  ocr_text?: string;

  @ApiPropertyOptional({ example: [{ text: 'Login', confidence: 0.98 }] })
  @IsOptional()
  detected_text_blocks?: unknown;

  @ApiPropertyOptional({ example: ['https://example.com/login'] })
  @IsOptional()
  detected_urls?: unknown;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  has_qr_code?: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/login' })
  @IsOptional()
  @IsString()
  qr_content?: string;

  @ApiPropertyOptional({ example: 62.5 })
  @IsOptional()
  @IsNumber()
  @Max(999.99)
  image_score?: number;

  @ApiPropertyOptional({ example: { detector: 'ocr-v1' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
