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
import { CreateRagMatchesDto } from './dto/create_rag_matches.dto';
import { RagMatchesResponseDto } from './dto/rag_matches_response.dto';
import { UpdateRagMatchesDto } from './dto/update_rag_matches.dto';
import { RagMatchesService } from './rag_matches.service';

@ApiTags('RAG Matches')
@Controller('rag_matches')
export class RagMatchesController {
  constructor(private readonly service: RagMatchesService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPaginated(Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('all')
  @ApiOkResponse({ type: RagMatchesResponseDto, isArray: true })
  findAll() {
    return this.service.findAll();
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  @Get('scan/:scanId')
  findByScanId(@Param('scanId') scanId: string) {
    return this.service.findByScanId(scanId);
  }

  @Get('dataset/:datasetId')
  findByDatasetId(@Param('datasetId') datasetId: string) {
    return this.service.findByDatasetId(datasetId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: 'mat-550e8400-e29b-41d4-a716-446655440000' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreateRagMatchesDto })
  @ApiCreatedResponse({ type: RagMatchesResponseDto })
  create(@Body() dto: CreateRagMatchesDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateRagMatchesDto })
  update(@Param('id') id: string, @Body() dto: UpdateRagMatchesDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    schema: { example: { message: 'RAG match deleted successfully' } },
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
