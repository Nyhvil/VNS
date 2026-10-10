import { PartialType } from '@nestjs/swagger';
import { CreateRagMatchesDto } from './create_rag_matches.dto';

export class UpdateRagMatchesDto extends PartialType(CreateRagMatchesDto) {}
