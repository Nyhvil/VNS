import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { BasePgCrudService } from '../../common/crud/base_pg_crud.service';
import { NormalizedInputsResponseDto } from './dto/normalized_inputs_response.dto';
import { NormalizedInputsRow } from './interfaces/normalized_inputs.interface';

@Injectable()
export class NormalizedInputsService extends BasePgCrudService<
  NormalizedInputsRow,
  NormalizedInputsResponseDto
> {
  constructor(@Inject('PG_POOL') pool: Pool) {
    super(pool, {
      tableName: 'normalized_inputs',
      idPrefix: 'nor',
      entityName: 'Normalized input',
      responseMapper: (row) =>
        new NormalizedInputsResponseDto(row as NormalizedInputsRow),
      requiredFields: ['scan_id', 'normalized_text'],
      fields: [
        { name: 'scan_id' },
        { name: 'normalized_text' },
        { name: 'language' },
        { name: 'extracted_urls', type: 'json' },
        { name: 'extracted_domains', type: 'json' },
        { name: 'extracted_keywords', type: 'json' },
        { name: 'ocr_text' },
        { name: 'metadata', type: 'json' },
      ],
      searchableFields: [
        'id',
        'scan_id',
        'normalized_text',
        'language',
        'ocr_text',
      ],
    });
  }
}
