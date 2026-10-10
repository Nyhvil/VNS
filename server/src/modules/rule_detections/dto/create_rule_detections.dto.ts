import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
} from 'class-validator';
import { SeverityType } from '../interfaces/rule_detections.interface';

export class CreateRuleDetectionsDto {
  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  @Matches(/^scn-[0-9a-f-]{36}$/)
  scan_id!: string;

  @ApiProperty({ example: 'URL_SHORTENER' })
  @IsString()
  @MaxLength(100)
  rule_code!: string;

  @ApiProperty({ example: 'Shortened URL detected' })
  @IsString()
  @MaxLength(255)
  rule_name!: string;

  @ApiProperty({ enum: SeverityType, example: SeverityType.HIGH })
  @IsEnum(SeverityType)
  severity!: SeverityType;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  @Max(999.99)
  score?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_triggered?: boolean;

  @ApiPropertyOptional({ example: { url: 'https://bit.ly/example' } })
  @IsOptional()
  evidence?: unknown;
}
