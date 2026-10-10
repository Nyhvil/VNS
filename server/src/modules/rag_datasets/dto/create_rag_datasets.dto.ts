import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DatasetLabel } from '../interfaces/rag_datasets.interface';

export class CreateRagDatasetsDto {
  @ApiProperty({ enum: DatasetLabel, example: DatasetLabel.PHISHING })
  @IsEnum(DatasetLabel)
  label!: DatasetLabel;

  @ApiPropertyOptional({ example: 'phishtank' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({ example: 'Credential harvesting sample' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'Your mailbox is full. Sign in to verify your account.',
  })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string;

  @ApiPropertyOptional({ example: { campaign: 'credential' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
