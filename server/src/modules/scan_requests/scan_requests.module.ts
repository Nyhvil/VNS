import { Module } from '@nestjs/common';
import { ScanRequestsController } from './scan_requests.controller';
import { ScanRequestsService } from './scan_requests.service';

@Module({
  controllers: [ScanRequestsController],
  providers: [ScanRequestsService],
  exports: [ScanRequestsService],
})
export class ScanRequestsModule {}
