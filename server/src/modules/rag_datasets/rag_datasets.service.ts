import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { BasePgCrudService } from '../../common/crud/base_pg_crud.service';
import { RagDatasetsResponseDto } from './dto/rag_datasets_response.dto';
import {
  DatasetLabel,
  RagDatasetsRow,
} from './interfaces/rag_datasets.interface';

@Injectable()
export class RagDatasetsService extends BasePgCrudService<
  RagDatasetsRow,
  RagDatasetsResponseDto
> {
  constructor(@Inject('PG_POOL') pool: Pool) {
    super(pool, {
      tableName: 'rag_datasets',
      idPrefix: 'dat',
      entityName: 'RAG dataset',
      responseMapper: (row) =>
        new RagDatasetsResponseDto(row as RagDatasetsRow),
      requiredFields: ['label', 'content'],
      fields: [
        { name: 'label', enumType: 'dataset_label' },
        { name: 'source' },
        { name: 'title' },
        { name: 'content' },
        { name: 'language' },
        { name: 'metadata', type: 'json' },
      ],
      searchableFields: [
        'id',
        'label',
        'source',
        'title',
        'content',
        'language',
      ],
    });
  }

  findByLabel(label: DatasetLabel): Promise<RagDatasetsResponseDto[]> {
    return this.findByField('label', label);
  }
}
