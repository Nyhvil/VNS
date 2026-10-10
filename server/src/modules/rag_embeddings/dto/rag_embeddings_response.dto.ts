import { ApiProperty } from '@nestjs/swagger';
import { RagEmbeddingsRow } from '../interfaces/rag_embeddings.interface';

export class RagEmbeddingsResponseDto implements RagEmbeddingsRow {
  @ApiProperty({ example: 'emb-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;
  dataset_id!: string;
  embedding!: unknown;
  embedding_model!: string;
  created_at!: Date;

  constructor(row: RagEmbeddingsRow) {
    Object.assign(this, row);
  }
}
