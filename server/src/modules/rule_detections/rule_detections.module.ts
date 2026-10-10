import { Module } from '@nestjs/common';
import { RuleDetectionsController } from './rule_detections.controller';
import { RuleDetectionsService } from './rule_detections.service';

@Module({
  controllers: [RuleDetectionsController],
  providers: [RuleDetectionsService],
})
export class RuleDetectionsModule {}
