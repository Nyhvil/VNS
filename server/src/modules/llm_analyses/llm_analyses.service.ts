import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { BasePgCrudService } from '../../common/crud/base_pg_crud.service';
import { LlmAnalysesResponseDto } from './dto/llm_analyses_response.dto';
import { LlmAnalysesRow } from './interfaces/llm_analyses.interface';

@Injectable()
export class LlmAnalysesService extends BasePgCrudService<
  LlmAnalysesRow,
  LlmAnalysesResponseDto
> {
  constructor(@Inject('PG_POOL') pool: Pool) {
    super(pool, {
      tableName: 'llm_analyses',
      idPrefix: 'llm',
      entityName: 'LLM analysis',
      responseMapper: (row) =>
        new LlmAnalysesResponseDto(row as LlmAnalysesRow),
      requiredFields: ['scan_id'],
      fields: [
        { name: 'scan_id' },
        { name: 'provider' },
        { name: 'model' },
        { name: 'prompt' },
        { name: 'response' },
        { name: 'llm_score', type: 'numeric' },
        { name: 'explanation' },
      ],
      searchableFields: [
        'id',
        'scan_id',
        'provider',
        'model',
        'prompt',
        'response',
        'explanation',
      ],
    });
  }
}
