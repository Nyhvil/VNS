import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { BasePgCrudService } from '../../common/crud/base_pg_crud.service';
import { RagMatchesResponseDto } from './dto/rag_matches_response.dto';
import { RagMatchesRow } from './interfaces/rag_matches.interface';

@Injectable()
export class RagMatchesService extends BasePgCrudService<
  RagMatchesRow,
  RagMatchesResponseDto
> {
  constructor(@Inject('PG_POOL') pool: Pool) {
    super(pool, {
      tableName: 'rag_matches',
      idPrefix: 'mat',
      entityName: 'RAG match',
      responseMapper: (row) => new RagMatchesResponseDto(row as RagMatchesRow),
      requiredFields: ['scan_id', 'similarity_score'],
      fields: [
        { name: 'scan_id' },
        { name: 'dataset_id' },
        { name: 'similarity_score', type: 'numeric' },
        { name: 'matched_label', enumType: 'dataset_label' },
        { name: 'matched_text' },
        { name: 'metadata', type: 'json' },
      ],
      searchableFields: [
        'id',
        'scan_id',
        'dataset_id',
        'matched_label',
        'matched_text',
      ],
    });
  }

  findByDatasetId(datasetId: string): Promise<RagMatchesResponseDto[]> {
    this.validateId(datasetId, 'dat', 'RAG dataset');
    return this.findByField('dataset_id', datasetId);
  }
}
