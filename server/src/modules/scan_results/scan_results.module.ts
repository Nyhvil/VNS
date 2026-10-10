import { Module } from '@nestjs/common';
import { ScanResultsController } from './scan_results.controller';
import { ScanResultsService } from './scan_results.service';

@Module({
  controllers: [ScanResultsController],
  providers: [ScanResultsService],
})
export class ScanResultsModule {}
