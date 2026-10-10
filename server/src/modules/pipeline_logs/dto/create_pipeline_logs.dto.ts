import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ScanStatus } from '../../scan_requests/interfaces/scan_requests.interface';

export class CreatePipelineLogsDto {
  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  @Matches(/^scn-[0-9a-f-]{36}$/)
  scan_id!: string;

  @ApiProperty({ example: 'normalize_input' })
  @IsString()
  @MaxLength(100)
  step!: string;

  @ApiProperty({ enum: ScanStatus, example: ScanStatus.PROCESSING })
  @IsEnum(ScanStatus)
  status!: ScanStatus;

  @ApiPropertyOptional({ example: 'Normalized input successfully' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ example: 'OCR timeout' })
  @IsOptional()
  @IsString()
  error_detail?: string;

  @ApiPropertyOptional({ example: { duration_ms: 120 } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
