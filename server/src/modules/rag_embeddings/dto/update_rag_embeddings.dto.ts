import { PartialType } from '@nestjs/swagger';
import { CreateRagEmbeddingsDto } from './create_rag_embeddings.dto';

export class UpdateRagEmbeddingsDto extends PartialType(
  CreateRagEmbeddingsDto,
) {}
