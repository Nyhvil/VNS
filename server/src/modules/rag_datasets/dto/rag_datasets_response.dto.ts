import { ApiProperty } from '@nestjs/swagger';
import {
  DatasetLabel,
  RagDatasetsRow,
} from '../interfaces/rag_datasets.interface';

export class RagDatasetsResponseDto implements RagDatasetsRow {
  @ApiProperty({ example: 'dat-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;
  label!: DatasetLabel;
  source!: string | null;
  title!: string | null;
  content!: string;
  language!: string | null;
  metadata!: unknown;
  created_at!: Date;
  updated_at!: Date;

  constructor(row: RagDatasetsRow) {
    Object.assign(this, row);
  }
}
