import { ApiProperty } from '@nestjs/swagger';
import { EmailReceivedChainsRow } from '../interfaces/email_received_chains.interface';

export class EmailReceivedChainsResponseDto {
  @ApiProperty({ example: 'rch-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'eml-550e8400-e29b-41d4-a716-446655440000' })
  email_parse_id!: string;

  @ApiProperty({ example: 1 })
  chain_order!: number;

  @ApiProperty({ example: '192.0.2.10', nullable: true })
  ip_address!: string | null;

  @ApiProperty({ example: 'mail.example.com', nullable: true })
  mail_server!: string | null;

  @ApiProperty({ example: 'sender.example.com', nullable: true })
  received_from!: string | null;

  @ApiProperty({ example: 'mx.mailguard.com', nullable: true })
  received_by!: string | null;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z', nullable: true })
  received_at!: Date | null;

  @ApiProperty({
    example: 'Received: from sender.example.com by mx.mailguard.com;',
    nullable: true,
  })
  raw_line!: string | null;

  constructor(chain: EmailReceivedChainsRow) {
    this.id = chain.id;
    this.email_parse_id = chain.email_parse_id;
    this.chain_order = chain.chain_order;
    this.ip_address = chain.ip_address;
    this.mail_server = chain.mail_server;
    this.received_from = chain.received_from;
    this.received_by = chain.received_by;
    this.received_at = chain.received_at;
    this.raw_line = chain.raw_line;
  }
}
