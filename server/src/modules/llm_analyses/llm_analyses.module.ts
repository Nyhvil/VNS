import { Module } from '@nestjs/common';
import { LlmAnalysesController } from './llm_analyses.controller';
import { LlmAnalysesService } from './llm_analyses.service';

@Module({
  controllers: [LlmAnalysesController],
  providers: [LlmAnalysesService],
})
export class LlmAnalysesModule {}
