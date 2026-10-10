import { ApiProperty } from '@nestjs/swagger';
import { ScanStatus } from '../../scan_requests/interfaces/scan_requests.interface';
import { PipelineLogsRow } from '../interfaces/pipeline_logs.interface';

export class PipelineLogsResponseDto implements PipelineLogsRow {
  @ApiProperty({ example: 'log-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;
  scan_id!: string;
  step!: string;
  status!: ScanStatus;
  message!: string | null;
  error_detail!: string | null;
  metadata!: unknown;
  created_at!: Date;

  constructor(row: PipelineLogsRow) {
    Object.assign(this, row);
  }
}
