import { ApiProperty } from '@nestjs/swagger';
import { DatasetLabel } from '../../rag_datasets/interfaces/rag_datasets.interface';
import { RagMatchesRow } from '../interfaces/rag_matches.interface';

export class RagMatchesResponseDto implements Omit<
  RagMatchesRow,
  'similarity_score'
> {
  @ApiProperty({ example: 'mat-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;
  scan_id!: string;
  dataset_id!: string | null;
  similarity_score!: number;
  matched_label!: DatasetLabel | null;
  matched_text!: string | null;
  metadata!: unknown;
  created_at!: Date;

  constructor(row: RagMatchesRow) {
    Object.assign(this, row);
    this.similarity_score = Number(row.similarity_score);
  }
}
