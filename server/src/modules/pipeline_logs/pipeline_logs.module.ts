import { Module } from '@nestjs/common';
import { PipelineLogsController } from './pipeline_logs.controller';
import { PipelineLogsService } from './pipeline_logs.service';

@Module({
  controllers: [PipelineLogsController],
  providers: [PipelineLogsService],
})
export class PipelineLogsModule {}
