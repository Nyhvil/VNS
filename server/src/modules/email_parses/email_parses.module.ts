import { Module } from '@nestjs/common';
import { EmailParsesController } from './email_parses.controller';
import { EmailParsesService } from './email_parses.service';

@Module({
  controllers: [EmailParsesController],
  providers: [EmailParsesService],
  exports: [EmailParsesService],
})
export class EmailParsesModule {}
