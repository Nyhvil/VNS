import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { BasePgCrudService } from '../../common/crud/base_pg_crud.service';
import { ScanFeaturesResponseDto } from './dto/scan_features_response.dto';
import { ScanFeaturesRow } from './interfaces/scan_features.interface';

@Injectable()
export class ScanFeaturesService extends BasePgCrudService<
  ScanFeaturesRow,
  ScanFeaturesResponseDto
> {
  constructor(@Inject('PG_POOL') pool: Pool) {
    super(pool, {
      tableName: 'scan_features',
      idPrefix: 'fea',
      entityName: 'Scan feature',
      responseMapper: (row) =>
        new ScanFeaturesResponseDto(row as ScanFeaturesRow),
      requiredFields: ['scan_id'],
      fields: [
        { name: 'scan_id' },
        { name: 'sender_domain' },
        { name: 'sender_ip' },
        { name: 'has_urgent_keyword', type: 'boolean' },
        { name: 'has_verify_keyword', type: 'boolean' },
        { name: 'has_login_keyword', type: 'boolean' },
        { name: 'from_reply_to_mismatch', type: 'boolean' },
        { name: 'domain_spoofing', type: 'boolean' },
        { name: 'suspicious_link', type: 'boolean' },
        { name: 'failed_authentication', type: 'boolean' },
        { name: 'features', type: 'json' },
      ],
      searchableFields: ['id', 'scan_id', 'sender_domain', 'sender_ip'],
    });
  }
}
