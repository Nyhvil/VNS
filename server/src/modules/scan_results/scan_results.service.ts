import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { BasePgCrudService } from '../../common/crud/base_pg_crud.service';
import { ScanResultsResponseDto } from './dto/scan_results_response.dto';
import { ScanResultsRow } from './interfaces/scan_results.interface';

@Injectable()
export class ScanResultsService extends BasePgCrudService<
  ScanResultsRow,
  ScanResultsResponseDto
> {
  constructor(@Inject('PG_POOL') pool: Pool) {
    super(pool, {
      tableName: 'scan_results',
      idPrefix: 'res',
      entityName: 'Scan result',
      responseMapper: (row) =>
        new ScanResultsResponseDto(row as ScanResultsRow),
      requiredFields: ['scan_id', 'verdict', 'risk_percent'],
      fields: [
        { name: 'scan_id' },
        { name: 'verdict', enumType: 'verdict_type' },
        { name: 'risk_percent', type: 'numeric' },
        { name: 'rag_score', type: 'numeric' },
        { name: 'rule_score', type: 'numeric' },
        { name: 'header_score', type: 'numeric' },
        { name: 'image_score', type: 'numeric' },
        { name: 'llm_score', type: 'numeric' },
        { name: 'formula', type: 'json' },
        { name: 'summary' },
        { name: 'header_explanation' },
        { name: 'content_explanation' },
        { name: 'link_explanation' },
        { name: 'recommendation' },
        { name: 'evidence', type: 'json' },
      ],
      searchableFields: [
        'id',
        'scan_id',
        'verdict',
        'summary',
        'header_explanation',
        'content_explanation',
        'link_explanation',
        'recommendation',
      ],
    });
  }
}
