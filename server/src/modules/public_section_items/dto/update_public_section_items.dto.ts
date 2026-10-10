import { PartialType } from '@nestjs/swagger';
import { CreatePublicSectionItemsDto } from './create_public_section_items.dto';

export class UpdatePublicSectionItemsDto extends PartialType(
  CreatePublicSectionItemsDto,
) {}
