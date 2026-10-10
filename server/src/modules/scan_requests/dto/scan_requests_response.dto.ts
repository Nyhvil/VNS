import { ApiProperty } from '@nestjs/swagger';
import {
  ScanInputType,
  ScanRequestsRow,
  ScanStatus,
} from '../interfaces/scan_requests.interface';

export class ScanRequestsResponseDto {
  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({
    example: 'usr-550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  user_id!: string | null;

  @ApiProperty({ enum: ScanInputType, example: ScanInputType.EML })
  input_type!: ScanInputType;

  @ApiProperty({ enum: ScanStatus, example: ScanStatus.PENDING })
  status!: ScanStatus;

  @ApiProperty({
    example: 'Please verify your account at https://example.com',
    nullable: true,
  })
  original_text!: string | null;

  @ApiProperty({ example: 'https://example.com/login', nullable: true })
  original_url!: string | null;

  @ApiProperty({ example: 'message.eml', nullable: true })
  file_name!: string | null;

  @ApiProperty({ example: 'message/rfc822', nullable: true })
  file_mime_type!: string | null;

  @ApiProperty({ example: 24576, nullable: true })
  file_size!: number | null;

  @ApiProperty({
    example: 'https://storage.example.com/uploads/message.eml',
    nullable: true,
  })
  file_url!: string | null;

  @ApiProperty({ example: 'Failed to download file', nullable: true })
  error_message!: string | null;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  updated_at!: Date;

  constructor(scanRequest: ScanRequestsRow) {
    this.id = scanRequest.id;
    this.user_id = scanRequest.user_id;
    this.input_type = scanRequest.input_type;
    this.status = scanRequest.status;
    this.original_text = scanRequest.original_text;
    this.original_url = scanRequest.original_url;
    this.file_name = scanRequest.file_name;
    this.file_mime_type = scanRequest.file_mime_type;
    this.file_size =
      scanRequest.file_size === null ? null : Number(scanRequest.file_size);
    this.file_url = scanRequest.file_url;
    this.error_message = scanRequest.error_message;
    this.created_at = scanRequest.created_at;
    this.updated_at = scanRequest.updated_at;
  }
}
