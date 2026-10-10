import { Module } from '@nestjs/common';
import { RagDatasetsController } from './rag_datasets.controller';
import { RagDatasetsService } from './rag_datasets.service';

@Module({
  controllers: [RagDatasetsController],
  providers: [RagDatasetsService],
})
export class RagDatasetsModule {}
