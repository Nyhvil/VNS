import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateLlmAnalysesDto {
  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  @Matches(/^scn-[0-9a-f-]{36}$/)
  scan_id!: string;

  @ApiPropertyOptional({ example: 'openai' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  provider?: string;

  @ApiPropertyOptional({ example: 'gpt-4.1-mini' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ example: 'Analyze this email...' })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({ example: 'The email is suspicious because...' })
  @IsOptional()
  @IsString()
  response?: string;

  @ApiPropertyOptional({ example: 78.5 })
  @IsOptional()
  @IsNumber()
  @Max(999.99)
  llm_score?: number;

  @ApiPropertyOptional({
    example: 'The message requests urgent credential verification.',
  })
  @IsOptional()
  @IsString()
  explanation?: string;
}
