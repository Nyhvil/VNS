import { PartialType } from '@nestjs/swagger';
import { CreateScanRequestsDto } from './create_scan_requests.dto';

export class UpdateScanRequestsDto extends PartialType(CreateScanRequestsDto) {}
