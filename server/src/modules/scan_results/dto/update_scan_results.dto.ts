import { PartialType } from '@nestjs/swagger';
import { CreateScanResultsDto } from './create_scan_results.dto';

export class UpdateScanResultsDto extends PartialType(CreateScanResultsDto) {}
