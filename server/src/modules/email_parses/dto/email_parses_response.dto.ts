import { ApiProperty } from '@nestjs/swagger';
import { EmailParsesRow } from '../interfaces/email_parses.interface';

export class EmailParsesResponseDto {
  @ApiProperty({ example: 'eml-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'scn-550e8400-e29b-41d4-a716-446655440000' })
  scan_id!: string;

  @ApiProperty({
    example: 'Urgent account verification required',
    nullable: true,
  })
  subject!: string | null;

  @ApiProperty({ example: 'security@example.com', nullable: true })
  from_email!: string | null;

  @ApiProperty({ example: 'example.com', nullable: true })
  from_domain!: string | null;

  @ApiProperty({ example: 'victim@mailguard.com', nullable: true })
  to_email!: string | null;

  @ApiProperty({ example: 'support@example.com', nullable: true })
  reply_to!: string | null;

  @ApiProperty({ example: 'Please verify your account.', nullable: true })
  body_text!: string | null;

  @ApiProperty({
    example: '<p>Please verify your account.</p>',
    nullable: true,
  })
  body_html!: string | null;

  @ApiProperty({ example: 'pass', nullable: true })
  spf_status!: string | null;

  @ApiProperty({ example: 'fail', nullable: true })
  dkim_status!: string | null;

  @ApiProperty({ example: 'none', nullable: true })
  dmarc_status!: string | null;

  @ApiProperty({ example: 'bounce@example.com', nullable: true })
  return_path!: string | null;

  @ApiProperty({ example: '<message-id@example.com>', nullable: true })
  message_id!: string | null;

  @ApiProperty({ example: 'PHPMailer 6.9', nullable: true })
  mailer!: string | null;

  @ApiProperty({
    example: {
      from: 'security@example.com',
      subject: 'Urgent account verification required',
    },
    nullable: true,
  })
  raw_headers!: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  parsed_at!: Date;

  constructor(emailParse: EmailParsesRow) {
    this.id = emailParse.id;
    this.scan_id = emailParse.scan_id;
    this.subject = emailParse.subject;
    this.from_email = emailParse.from_email;
    this.from_domain = emailParse.from_domain;
    this.to_email = emailParse.to_email;
    this.reply_to = emailParse.reply_to;
    this.body_text = emailParse.body_text;
    this.body_html = emailParse.body_html;
    this.spf_status = emailParse.spf_status;
    this.dkim_status = emailParse.dkim_status;
    this.dmarc_status = emailParse.dmarc_status;
    this.return_path = emailParse.return_path;
    this.message_id = emailParse.message_id;
    this.mailer = emailParse.mailer;
    this.raw_headers = emailParse.raw_headers;
    this.parsed_at = emailParse.parsed_at;
  }
}
