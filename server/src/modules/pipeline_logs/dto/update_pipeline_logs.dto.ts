import { PartialType } from '@nestjs/swagger';
import { CreatePipelineLogsDto } from './create_pipeline_logs.dto';

export class UpdatePipelineLogsDto extends PartialType(CreatePipelineLogsDto) {}
