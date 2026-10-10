import { Module } from '@nestjs/common';
import { NormalizedInputsController } from './normalized_inputs.controller';
import { NormalizedInputsService } from './normalized_inputs.service';

@Module({
  controllers: [NormalizedInputsController],
  providers: [NormalizedInputsService],
})
export class NormalizedInputsModule {}
