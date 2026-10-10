import { Module } from '@nestjs/common';
import { PublicPagesController } from './public_pages.controller';
import { PublicPagesService } from './public_pages.service';

@Module({
  controllers: [PublicPagesController],
  providers: [PublicPagesService],
  exports: [PublicPagesService],
})
export class PublicPagesModule {}
