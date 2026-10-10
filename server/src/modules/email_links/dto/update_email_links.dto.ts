import { PartialType } from '@nestjs/swagger';
import { CreateEmailLinksDto } from './create_email_links.dto';

export class UpdateEmailLinksDto extends PartialType(CreateEmailLinksDto) {}
