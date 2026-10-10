import { ApiProperty } from '@nestjs/swagger';
import {
  AnalyzeJobRow,
  AnalyzeResultRow,
} from '../interfaces/analyze.interface';

export class AnalyzeJobResponseDto {
  @ApiProperty({ example: 'job-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  scan_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  job_id!: string;

  @ApiProperty({ example: 'success' })
  status!: string;

  @ApiProperty({ example: 'email_text' })
  input_type!: string;

  @ApiProperty({ example: 'http://localhost:3001', nullable: true })
  pipeline_url!: string | null;

  @ApiProperty({ nullable: true })
  error_message!: string | null;

  @ApiProperty({ nullable: true })
  started_at!: Date | null;

  @ApiProperty({ nullable: true })
  completed_at!: Date | null;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;

  constructor(row: AnalyzeJobRow) {
    Object.assign(this, row);
  }
}

export class AnalyzeResultResponseDto {
  @ApiProperty({ example: 'ares-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'job-550e8400-e29b-41d4-a716-446655440000' })
  job_id!: string;

  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  scan_id!: string;

  @ApiProperty({ example: 82 })
  risk_score!: number;

  @ApiProperty({ example: 'high' })
  risk_level!: string;

  @ApiProperty({ example: 'phishing' })
  category!: string;

  @ApiProperty({ isArray: true })
  findings!: unknown;

  @ApiProperty()
  evidence!: unknown;

  @ApiProperty({ nullable: true })
  recommendation!: string | null;

  @ApiProperty()
  raw_response!: unknown;

  @ApiProperty()
  created_at!: Date;

  constructor(row: AnalyzeResultRow) {
    Object.assign(this, row);
    this.risk_score = Number(row.risk_score);
  }
}

export class AnalyzeFullResponseDto {
  @ApiProperty({ type: AnalyzeJobResponseDto })
  job!: AnalyzeJobResponseDto;

  @ApiProperty({ type: AnalyzeResultResponseDto, nullable: true })
  result!: AnalyzeResultResponseDto | null;
}
