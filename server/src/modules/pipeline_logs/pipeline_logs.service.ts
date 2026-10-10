import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { BasePgCrudService } from '../../common/crud/base_pg_crud.service';
import { PipelineLogsResponseDto } from './dto/pipeline_logs_response.dto';
import { PipelineLogsRow } from './interfaces/pipeline_logs.interface';

@Injectable()
export class PipelineLogsService extends BasePgCrudService<
  PipelineLogsRow,
  PipelineLogsResponseDto
> {
  constructor(@Inject('PG_POOL') pool: Pool) {
    super(pool, {
      tableName: 'pipeline_logs',
      idPrefix: 'log',
      entityName: 'Pipeline log',
      responseMapper: (row) =>
        new PipelineLogsResponseDto(row as PipelineLogsRow),
      requiredFields: ['scan_id', 'step', 'status'],
      fields: [
        { name: 'scan_id' },
        { name: 'step' },
        { name: 'status', enumType: 'scan_status' },
        { name: 'message' },
        { name: 'error_detail' },
        { name: 'metadata', type: 'json' },
      ],
      searchableFields: [
        'id',
        'scan_id',
        'step',
        'status',
        'message',
        'error_detail',
      ],
    });
  }
}
