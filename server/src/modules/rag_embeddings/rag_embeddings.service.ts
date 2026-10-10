import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { BasePgCrudService } from '../../common/crud/base_pg_crud.service';
import { RagEmbeddingsResponseDto } from './dto/rag_embeddings_response.dto';
import { RagEmbeddingsRow } from './interfaces/rag_embeddings.interface';

@Injectable()
export class RagEmbeddingsService extends BasePgCrudService<
  RagEmbeddingsRow,
  RagEmbeddingsResponseDto
> {
  constructor(@Inject('PG_POOL') pool: Pool) {
    super(pool, {
      tableName: 'rag_embeddings',
      idPrefix: 'emb',
      entityName: 'RAG embedding',
      responseMapper: (row) =>
        new RagEmbeddingsResponseDto(row as RagEmbeddingsRow),
      requiredFields: ['dataset_id', 'embedding', 'embedding_model'],
      fields: [
        { name: 'dataset_id' },
        { name: 'embedding', type: 'vector' },
        { name: 'embedding_model' },
      ],
      searchableFields: ['id', 'dataset_id', 'embedding_model'],
    });
  }

  findByDatasetId(datasetId: string): Promise<RagEmbeddingsResponseDto[]> {
    this.validateId(datasetId, 'dat', 'RAG dataset');
    return this.findByField('dataset_id', datasetId);
  }
}
