import { PartialType } from '@nestjs/swagger';
import { CreatePublicSectionsDto } from './create_public_sections.dto';

export class UpdatePublicSectionsDto extends PartialType(
  CreatePublicSectionsDto,
) {}
