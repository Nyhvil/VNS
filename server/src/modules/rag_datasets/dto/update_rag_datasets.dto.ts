import { PartialType } from '@nestjs/swagger';
import { CreateRagDatasetsDto } from './create_rag_datasets.dto';

export class UpdateRagDatasetsDto extends PartialType(CreateRagDatasetsDto) {}
