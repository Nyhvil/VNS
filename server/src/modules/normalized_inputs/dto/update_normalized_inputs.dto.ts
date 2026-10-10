import { PartialType } from '@nestjs/swagger';
import { CreateNormalizedInputsDto } from './create_normalized_inputs.dto';

export class UpdateNormalizedInputsDto extends PartialType(
  CreateNormalizedInputsDto,
) {}
