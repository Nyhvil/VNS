import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PublicSectionType } from '../interfaces/public_sections.interface';

export class CreatePublicSectionsDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  page_id!: string;

  @ApiProperty({ example: 'hero' })
  @IsString()
  @MaxLength(120)
  key!: string;

  @ApiProperty({ enum: PublicSectionType, example: PublicSectionType.HERO })
  @IsEnum(PublicSectionType)
  type!: PublicSectionType;

  @ApiPropertyOptional({ example: 'Protect your inbox with AI' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Fast phishing detection for everyone' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: { badge: 'AI Powered' } })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  order_index?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
