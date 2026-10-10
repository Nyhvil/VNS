import { ApiProperty } from '@nestjs/swagger';
import { EmailLinksRow } from '../interfaces/email_links.interface';

export class EmailLinksResponseDto {
  @ApiProperty({ example: 'lnk-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  scan_id!: string;

  @ApiProperty({
    example: 'eml-550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  email_parse_id!: string | null;

  @ApiProperty({ example: 'https://example.com/login' })
  original_url!: string;

  @ApiProperty({ example: 'Verify account', nullable: true })
  display_text!: string | null;

  @ApiProperty({ example: 'example.com', nullable: true })
  domain!: string | null;

  @ApiProperty({ example: false })
  is_shortened!: boolean;

  @ApiProperty({ example: true })
  is_suspicious!: boolean;

  @ApiProperty({
    example: { redirect_count: 2 },
    nullable: true,
  })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  created_at!: Date;

  constructor(link: EmailLinksRow) {
    this.id = link.id;
    this.scan_id = link.scan_id;
    this.email_parse_id = link.email_parse_id;
    this.original_url = link.original_url;
    this.display_text = link.display_text;
    this.domain = link.domain;
    this.is_shortened = link.is_shortened;
    this.is_suspicious = link.is_suspicious;
    this.metadata = link.metadata;
    this.created_at = link.created_at;
  }
}
