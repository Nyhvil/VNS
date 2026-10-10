import { PartialType } from '@nestjs/swagger';
import { CreateEmailAttachmentsDto } from './create_email_attachments.dto';

export class UpdateEmailAttachmentsDto extends PartialType(
  CreateEmailAttachmentsDto,
) {}
