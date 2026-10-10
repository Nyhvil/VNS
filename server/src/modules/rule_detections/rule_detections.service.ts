import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { BasePgCrudService } from '../../common/crud/base_pg_crud.service';
import { RuleDetectionsResponseDto } from './dto/rule_detections_response.dto';
import { RuleDetectionsRow } from './interfaces/rule_detections.interface';

@Injectable()
export class RuleDetectionsService extends BasePgCrudService<
  RuleDetectionsRow,
  RuleDetectionsResponseDto
> {
  constructor(@Inject('PG_POOL') pool: Pool) {
    super(pool, {
      tableName: 'rule_detections',
      idPrefix: 'rul',
      entityName: 'Rule detection',
      responseMapper: (row) =>
        new RuleDetectionsResponseDto(row as RuleDetectionsRow),
      requiredFields: ['scan_id', 'rule_code', 'rule_name', 'severity'],
      fields: [
        { name: 'scan_id' },
        { name: 'rule_code' },
        { name: 'rule_name' },
        { name: 'severity', enumType: 'severity_type' },
        { name: 'score', type: 'numeric' },
        { name: 'is_triggered', type: 'boolean' },
        { name: 'evidence', type: 'json' },
      ],
      searchableFields: ['id', 'scan_id', 'rule_code', 'rule_name', 'severity'],
    });
  }
}
