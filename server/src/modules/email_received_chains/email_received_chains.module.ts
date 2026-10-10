import { Module } from '@nestjs/common';
import { EmailReceivedChainsController } from './email_received_chains.controller';
import { EmailReceivedChainsService } from './email_received_chains.service';

@Module({
  controllers: [EmailReceivedChainsController],
  providers: [EmailReceivedChainsService],
})
export class EmailReceivedChainsModule {}
