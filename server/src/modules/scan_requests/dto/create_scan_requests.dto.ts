import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ScanInputType,
  ScanStatus,
} from '../interfaces/scan_requests.interface';

export class CreateScanRequestsDto {
  @ApiPropertyOptional({
    example: 'usr-550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @Matches(/^usr-[0-9a-f-]{36}$/)
  user_id?: string;

  @ApiProperty({
    enum: ScanInputType,
    example: ScanInputType.EML,
  })
  @IsEnum(ScanInputType)
  input_type!: ScanInputType;

  @ApiPropertyOptional({
    enum: ScanStatus,
    example: ScanStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ScanStatus)
  status?: ScanStatus;

  @ApiPropertyOptional({
    example: 'Please verify your account at https://example.com',
  })
  @IsOptional()
  @IsString()
  original_text?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/login',
  })
  @IsOptional()
  @IsUrl()
  original_url?: string;

  @ApiPropertyOptional({
    example: 'message.eml',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_name?: string;

  @ApiPropertyOptional({
    example: 'message/rfc822',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  file_mime_type?: string;

  @ApiPropertyOptional({
    example: 24576,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  file_size?: number;

  @ApiPropertyOptional({
    example: 'https://storage.example.com/uploads/message.eml',
  })
  @IsOptional()
  @IsUrl()
  file_url?: string;

  @ApiPropertyOptional({
    example: 'Failed to download file',
  })
  @IsOptional()
  @IsString()
  error_message?: string;
}
