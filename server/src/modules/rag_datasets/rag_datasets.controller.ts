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
import { CreateRagDatasetsDto } from './dto/create_rag_datasets.dto';
import { RagDatasetsResponseDto } from './dto/rag_datasets_response.dto';
import { UpdateRagDatasetsDto } from './dto/update_rag_datasets.dto';
import { DatasetLabel } from './interfaces/rag_datasets.interface';
import { RagDatasetsService } from './rag_datasets.service';

@ApiTags('RAG Datasets')
@Controller('rag_datasets')
export class RagDatasetsController {
  constructor(private readonly service: RagDatasetsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPaginated(Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('all')
  @ApiOkResponse({ type: RagDatasetsResponseDto, isArray: true })
  findAll() {
    return this.service.findAll();
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  @Get('label/:label')
  findByLabel(@Param('label') label: DatasetLabel) {
    return this.service.findByLabel(label);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: 'dat-550e8400-e29b-41d4-a716-446655440000' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreateRagDatasetsDto })
  @ApiCreatedResponse({ type: RagDatasetsResponseDto })
  create(@Body() dto: CreateRagDatasetsDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateRagDatasetsDto })
  update(@Param('id') id: string, @Body() dto: UpdateRagDatasetsDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    schema: { example: { message: 'RAG dataset deleted successfully' } },
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
