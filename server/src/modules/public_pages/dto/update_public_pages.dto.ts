import { PartialType } from '@nestjs/swagger';
import { CreatePublicPagesDto } from './create_public_pages.dto';

export class UpdatePublicPagesDto extends PartialType(CreatePublicPagesDto) {}
