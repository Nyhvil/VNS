import { ApiProperty } from '@nestjs/swagger';
import { LlmAnalysesRow } from '../interfaces/llm_analyses.interface';

export class LlmAnalysesResponseDto implements Omit<
  LlmAnalysesRow,
  'llm_score'
> {
  @ApiProperty({ example: 'llm-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;
  scan_id!: string;
  provider!: string | null;
  model!: string | null;
  prompt!: string | null;
  response!: string | null;
  llm_score!: number;
  explanation!: string | null;
  created_at!: Date;

  constructor(row: LlmAnalysesRow) {
    Object.assign(this, row);
    this.llm_score = Number(row.llm_score ?? 0);
  }
}
