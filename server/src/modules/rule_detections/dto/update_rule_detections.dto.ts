import { PartialType } from '@nestjs/swagger';
import { CreateRuleDetectionsDto } from './create_rule_detections.dto';

export class UpdateRuleDetectionsDto extends PartialType(
  CreateRuleDetectionsDto,
) {}
