import { PartialType } from '@nestjs/swagger';
import { CreateImageAnalysesDto } from './create_image_analyses.dto';

export class UpdateImageAnalysesDto extends PartialType(
  CreateImageAnalysesDto,
) {}
