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
import { DatasetLabel } from '../../rag_datasets/interfaces/rag_datasets.interface';

export class CreateRagMatchesDto {
  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  @Matches(/^scn-[0-9a-f-]{36}$/)
  scan_id!: string;

  @ApiPropertyOptional({ example: 'dat-550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @Matches(/^dat-[0-9a-f-]{36}$/)
  dataset_id?: string;

  @ApiProperty({ example: 0.8432 })
  @IsNumber()
  @Max(99.9999)
  similarity_score!: number;

  @ApiPropertyOptional({ enum: DatasetLabel, example: DatasetLabel.PHISHING })
  @IsOptional()
  @IsEnum(DatasetLabel)
  matched_label?: DatasetLabel;

  @ApiPropertyOptional({ example: 'Matched phishing sample text' })
  @IsOptional()
  @IsString()
  matched_text?: string;

  @ApiPropertyOptional({ example: { rank: 1 } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
