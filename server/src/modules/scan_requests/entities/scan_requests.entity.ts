import {
  ScanInputType,
  ScanRequestsRow,
  ScanStatus,
} from '../interfaces/scan_requests.interface';

export type CreateScanRequestsModel = Pick<ScanRequestsRow, 'input_type'> &
  Partial<
    Pick<
      ScanRequestsRow,
      | 'user_id'
      | 'status'
      | 'original_text'
      | 'original_url'
      | 'file_name'
      | 'file_mime_type'
      | 'file_size'
      | 'file_url'
      | 'error_message'
    >
  >;

export type UpdateScanRequestsModel = Partial<
  Pick<
    ScanRequestsRow,
    | 'user_id'
    | 'input_type'
    | 'status'
    | 'original_text'
    | 'original_url'
    | 'file_name'
    | 'file_mime_type'
    | 'file_size'
    | 'file_url'
    | 'error_message'
  >
>;

export type ScanRequestFilters = {
  user_id?: string;
  input_type?: ScanInputType;
  status?: ScanStatus;
};
