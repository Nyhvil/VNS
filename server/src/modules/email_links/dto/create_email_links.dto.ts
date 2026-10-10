import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateEmailLinksDto {
  @ApiProperty({
    example: 'scn-550e8400-e29b-41d4-a716-446655440000',
  })
  @Matches(/^scn-[0-9a-f-]{36}$/)
  scan_id!: string;

  @ApiPropertyOptional({
    example: 'eml-550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @Matches(/^eml-[0-9a-f-]{36}$/)
  email_parse_id?: string;

  @ApiProperty({ example: 'https://example.com/login' })
  @IsUrl({ require_protocol: true })
  original_url!: string;

  @ApiPropertyOptional({ example: 'Verify account' })
  @IsOptional()
  @IsString()
  display_text?: string;

  @ApiPropertyOptional({ example: 'example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_shortened?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_suspicious?: boolean;

  @ApiPropertyOptional({
    example: {
      redirect_count: 2,
      final_url: 'https://example.com/login',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
