import { PartialType } from '@nestjs/swagger';
import { CreateScanFeaturesDto } from './create_scan_features.dto';

export class UpdateScanFeaturesDto extends PartialType(CreateScanFeaturesDto) {}
