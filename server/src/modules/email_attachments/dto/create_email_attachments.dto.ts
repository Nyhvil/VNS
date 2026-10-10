import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEmailAttachmentsDto {
  @ApiProperty({
    example: 'eml-550e8400-e29b-41d4-a716-446655440000',
  })
  @Matches(/^eml-[0-9a-f-]{36}$/)
  email_parse_id!: string;

  @ApiPropertyOptional({ example: 'invoice.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_name?: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mime_type?: string;

  @ApiPropertyOptional({ example: 153600 })
  @IsOptional()
  @IsInt()
  @Min(0)
  file_size?: number;

  @ApiPropertyOptional({ example: 'https://files.example.com/invoice.pdf' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  file_url?: string;

  @ApiPropertyOptional({ example: 'Invoice due immediately.' })
  @IsOptional()
  @IsString()
  extracted_text?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  has_image?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  has_macro?: boolean;

  @ApiPropertyOptional({
    example: {
      sha256: 'd2d2d2',
      page_count: 2,
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
