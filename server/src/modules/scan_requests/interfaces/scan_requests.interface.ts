export enum ScanInputType {
  TEXT = 'text',
  URL = 'url',
  IMAGE = 'image',
  EML = 'eml',
}

export enum ScanStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export type ScanRequestsRow = {
  id: string;
  user_id: string | null;
  input_type: ScanInputType;
  status: ScanStatus;
  original_text: string | null;
  original_url: string | null;
  file_name: string | null;
  file_mime_type: string | null;
  file_size: string | number | null;
  file_url: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};
