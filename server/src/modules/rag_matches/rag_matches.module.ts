import { Module } from '@nestjs/common';
import { RagMatchesController } from './rag_matches.controller';
import { RagMatchesService } from './rag_matches.service';

@Module({
  controllers: [RagMatchesController],
  providers: [RagMatchesService],
})
export class RagMatchesModule {}
