import { Module } from '@nestjs/common';
import { PublicSectionItemsController } from './public_section_items.controller';
import { PublicSectionItemsService } from './public_section_items.service';

@Module({
  controllers: [PublicSectionItemsController],
  providers: [PublicSectionItemsService],
  exports: [PublicSectionItemsService],
})
export class PublicSectionItemsModule {}
