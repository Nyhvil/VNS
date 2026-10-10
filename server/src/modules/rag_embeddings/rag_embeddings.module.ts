import { Module } from '@nestjs/common';
import { RagEmbeddingsController } from './rag_embeddings.controller';
import { RagEmbeddingsService } from './rag_embeddings.service';

@Module({
  controllers: [RagEmbeddingsController],
  providers: [RagEmbeddingsService],
})
export class RagEmbeddingsModule {}
