import { Module } from '@nestjs/common';
import { ScanFeaturesController } from './scan_features.controller';
import { ScanFeaturesService } from './scan_features.service';

@Module({
  controllers: [ScanFeaturesController],
  providers: [ScanFeaturesService],
})
export class ScanFeaturesModule {}
