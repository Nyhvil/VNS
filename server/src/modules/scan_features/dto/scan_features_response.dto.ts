import { ApiProperty } from '@nestjs/swagger';
import { ScanFeaturesRow } from '../interfaces/scan_features.interface';

export class ScanFeaturesResponseDto implements ScanFeaturesRow {
  @ApiProperty({ example: 'fea-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;
  scan_id!: string;
  sender_domain!: string | null;
  sender_ip!: string | null;
  has_urgent_keyword!: boolean;
  has_verify_keyword!: boolean;
  has_login_keyword!: boolean;
  from_reply_to_mismatch!: boolean;
  domain_spoofing!: boolean;
  suspicious_link!: boolean;
  failed_authentication!: boolean;
  features!: unknown;
  created_at!: Date;

  constructor(row: ScanFeaturesRow) {
    Object.assign(this, row);
  }
}
