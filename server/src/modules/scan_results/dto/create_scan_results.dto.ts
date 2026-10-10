import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
} from 'class-validator';
import { VerdictType } from '../interfaces/scan_results.interface';

export class CreateScanResultsDto {
  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  @Matches(/^scn-[0-9a-f-]{36}$/)
  scan_id!: string;

  @ApiProperty({ enum: VerdictType, example: VerdictType.SUSPICIOUS })
  @IsEnum(VerdictType)
  verdict!: VerdictType;

  @ApiProperty({ example: 72.5 })
  @IsNumber()
  @Max(999.99)
  risk_percent!: number;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @IsNumber()
  @Max(999.99)
  rag_score?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  @Max(999.99)
  rule_score?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsNumber()
  @Max(999.99)
  header_score?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Max(999.99)
  image_score?: number;

  @ApiPropertyOptional({ example: 75 })
  @IsOptional()
  @IsNumber()
  @Max(999.99)
  llm_score?: number;

  @ApiPropertyOptional({ example: { rag: 0.35, rule: 0.25 } })
  @IsOptional()
  @IsObject()
  formula?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'Suspicious credential verification request.',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ example: 'SPF/DKIM checks failed.' })
  @IsOptional()
  @IsString()
  header_explanation?: string;

  @ApiPropertyOptional({
    example: 'Urgent language asks the user to verify credentials.',
  })
  @IsOptional()
  @IsString()
  content_explanation?: string;

  @ApiPropertyOptional({ example: 'One link points to a mismatched domain.' })
  @IsOptional()
  @IsString()
  link_explanation?: string;

  @ApiPropertyOptional({ example: 'Do not click the link. Report this email.' })
  @IsOptional()
  @IsString()
  recommendation?: string;

  @ApiPropertyOptional({ example: { rules: ['URL_SHORTENER'] } })
  @IsOptional()
  evidence?: unknown;
}
