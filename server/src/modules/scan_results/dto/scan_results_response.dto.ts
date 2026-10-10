import { ApiProperty } from '@nestjs/swagger';
import {
  ScanResultsRow,
  VerdictType,
} from '../interfaces/scan_results.interface';

export class ScanResultsResponseDto implements Omit<
  ScanResultsRow,
  | 'risk_percent'
  | 'rag_score'
  | 'rule_score'
  | 'header_score'
  | 'image_score'
  | 'llm_score'
> {
  @ApiProperty({ example: 'res-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;
  scan_id!: string;
  verdict!: VerdictType;
  risk_percent!: number;
  rag_score!: number;
  rule_score!: number;
  header_score!: number;
  image_score!: number;
  llm_score!: number;
  formula!: unknown;
  summary!: string | null;
  header_explanation!: string | null;
  content_explanation!: string | null;
  link_explanation!: string | null;
  recommendation!: string | null;
  evidence!: unknown;
  created_at!: Date;

  constructor(row: ScanResultsRow) {
    Object.assign(this, row);
    this.risk_percent = Number(row.risk_percent);
    this.rag_score = Number(row.rag_score ?? 0);
    this.rule_score = Number(row.rule_score ?? 0);
    this.header_score = Number(row.header_score ?? 0);
    this.image_score = Number(row.image_score ?? 0);
    this.llm_score = Number(row.llm_score ?? 0);
  }
}
