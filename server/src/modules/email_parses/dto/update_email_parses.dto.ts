import { PartialType } from '@nestjs/swagger';
import { CreateEmailParsesDto } from './create_email_parses.dto';

export class UpdateEmailParsesDto extends PartialType(CreateEmailParsesDto) {}
