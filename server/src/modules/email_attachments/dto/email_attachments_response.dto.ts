import { ApiProperty } from '@nestjs/swagger';
import { EmailAttachmentsRow } from '../interfaces/email_attachments.interface';

export class EmailAttachmentsResponseDto {
  @ApiProperty({ example: 'att-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'eml-550e8400-e29b-41d4-a716-446655440000' })
  email_parse_id!: string;

  @ApiProperty({ example: 'invoice.pdf', nullable: true })
  file_name!: string | null;

  @ApiProperty({ example: 'application/pdf', nullable: true })
  mime_type!: string | null;

  @ApiProperty({ example: 153600, nullable: true })
  file_size!: string | number | null;

  @ApiProperty({
    example: 'https://files.example.com/invoice.pdf',
    nullable: true,
  })
  file_url!: string | null;

  @ApiProperty({ example: 'Invoice due immediately.', nullable: true })
  extracted_text!: string | null;

  @ApiProperty({ example: false })
  has_image!: boolean;

  @ApiProperty({ example: false })
  has_macro!: boolean;

  @ApiProperty({
    example: { sha256: 'd2d2d2' },
    nullable: true,
  })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  created_at!: Date;

  constructor(attachment: EmailAttachmentsRow) {
    this.id = attachment.id;
    this.email_parse_id = attachment.email_parse_id;
    this.file_name = attachment.file_name;
    this.mime_type = attachment.mime_type;
    this.file_size = attachment.file_size;
    this.file_url = attachment.file_url;
    this.extracted_text = attachment.extracted_text;
    this.has_image = attachment.has_image;
    this.has_macro = attachment.has_macro;
    this.metadata = attachment.metadata;
    this.created_at = attachment.created_at;
  }
}
