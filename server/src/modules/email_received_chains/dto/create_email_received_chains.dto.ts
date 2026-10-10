import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEmailReceivedChainsDto {
  @ApiProperty({
    example: 'eml-550e8400-e29b-41d4-a716-446655440000',
  })
  @Matches(/^eml-[0-9a-f-]{36}$/)
  email_parse_id!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  chain_order!: number;

  @ApiPropertyOptional({ example: '192.0.2.10' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ip_address?: string;

  @ApiPropertyOptional({ example: 'mail.example.com' })
  @IsOptional()
  @IsString()
  mail_server?: string;

  @ApiPropertyOptional({ example: 'sender.example.com' })
  @IsOptional()
  @IsString()
  received_from?: string;

  @ApiPropertyOptional({ example: 'mx.mailguard.com' })
  @IsOptional()
  @IsString()
  received_by?: string;

  @ApiPropertyOptional({ example: '2026-04-24T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  received_at?: string;

  @ApiPropertyOptional({
    example: 'Received: from sender.example.com by mx.mailguard.com;',
  })
  @IsOptional()
  @IsString()
  raw_line?: string;
}
