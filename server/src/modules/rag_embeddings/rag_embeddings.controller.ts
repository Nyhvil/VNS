import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateRagEmbeddingsDto } from './dto/create_rag_embeddings.dto';
import { RagEmbeddingsResponseDto } from './dto/rag_embeddings_response.dto';
import { UpdateRagEmbeddingsDto } from './dto/update_rag_embeddings.dto';
import { RagEmbeddingsService } from './rag_embeddings.service';

@ApiTags('RAG Embeddings')
@Controller('rag_embeddings')
export class RagEmbeddingsController {
  constructor(private readonly service: RagEmbeddingsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPaginated(Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('all')
  @ApiOkResponse({ type: RagEmbeddingsResponseDto, isArray: true })
  findAll() {
    return this.service.findAll();
  }

  @Get('dataset/:datasetId')
  findByDatasetId(@Param('datasetId') datasetId: string) {
    return this.service.findByDatasetId(datasetId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: 'emb-550e8400-e29b-41d4-a716-446655440000' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreateRagEmbeddingsDto })
  @ApiCreatedResponse({ type: RagEmbeddingsResponseDto })
  create(@Body() dto: CreateRagEmbeddingsDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateRagEmbeddingsDto })
  update(@Param('id') id: string, @Body() dto: UpdateRagEmbeddingsDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    schema: { example: { message: 'RAG embedding deleted successfully' } },
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
