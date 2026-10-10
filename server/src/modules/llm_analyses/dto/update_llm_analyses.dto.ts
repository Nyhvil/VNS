import { PartialType } from '@nestjs/swagger';
import { CreateLlmAnalysesDto } from './create_llm_analyses.dto';

export class UpdateLlmAnalysesDto extends PartialType(CreateLlmAnalysesDto) {}
