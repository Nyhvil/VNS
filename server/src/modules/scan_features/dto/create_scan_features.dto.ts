import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateScanFeaturesDto {
  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  @Matches(/^scn-[0-9a-f-]{36}$/)
  scan_id!: string;

  @ApiPropertyOptional({ example: 'example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sender_domain?: string;

  @ApiPropertyOptional({ example: '203.0.113.10' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sender_ip?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  has_urgent_keyword?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  has_verify_keyword?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  has_login_keyword?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  from_reply_to_mismatch?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  domain_spoofing?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  suspicious_link?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  failed_authentication?: boolean;

  @ApiPropertyOptional({ example: { url_count: 3, brand_mentions: ['bank'] } })
  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;
}
