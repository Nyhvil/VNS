import { Module } from '@nestjs/common';
import { EmailAttachmentsController } from './email_attachments.controller';
import { EmailAttachmentsService } from './email_attachments.service';

@Module({
  controllers: [EmailAttachmentsController],
  providers: [EmailAttachmentsService],
})
export class EmailAttachmentsModule {}
