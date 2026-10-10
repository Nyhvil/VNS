import { Module } from '@nestjs/common';
import { PublicSectionsController } from './public_sections.controller';
import { PublicSectionsService } from './public_sections.service';

@Module({
  controllers: [PublicSectionsController],
  providers: [PublicSectionsService],
  exports: [PublicSectionsService],
})
export class PublicSectionsModule {}
