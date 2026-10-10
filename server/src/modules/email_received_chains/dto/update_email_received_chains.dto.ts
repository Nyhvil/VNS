import { PartialType } from '@nestjs/swagger';
import { CreateEmailReceivedChainsDto } from './create_email_received_chains.dto';

export class UpdateEmailReceivedChainsDto extends PartialType(
  CreateEmailReceivedChainsDto,
) {}
