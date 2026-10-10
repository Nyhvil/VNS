import { Module } from '@nestjs/common';
import { EmailLinksController } from './email_links.controller';
import { EmailLinksService } from './email_links.service';

@Module({
  controllers: [EmailLinksController],
  providers: [EmailLinksService],
})
export class EmailLinksModule {}
