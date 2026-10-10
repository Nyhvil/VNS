import { ScanStatus } from '../../scan_requests/interfaces/scan_requests.interface';

export type PipelineLogsRow = {
  id: string;
  scan_id: string;
  step: string;
  status: ScanStatus;
  message: string | null;
  error_detail: string | null;
  metadata: unknown;
  created_at: Date;
};
