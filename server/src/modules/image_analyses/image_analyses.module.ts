import { Module } from '@nestjs/common';
import { ImageAnalysesController } from './image_analyses.controller';
import { ImageAnalysesService } from './image_analyses.service';

@Module({
  controllers: [ImageAnalysesController],
  providers: [ImageAnalysesService],
})
export class ImageAnalysesModule {}
