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
import { CreateLlmAnalysesDto } from './dto/create_llm_analyses.dto';
import { LlmAnalysesResponseDto } from './dto/llm_analyses_response.dto';
import { UpdateLlmAnalysesDto } from './dto/update_llm_analyses.dto';
import { LlmAnalysesService } from './llm_analyses.service';

@ApiTags('LLM Analyses')
@Controller('llm_analyses')
export class LlmAnalysesController {
  constructor(private readonly service: LlmAnalysesService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPaginated(Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('all')
  @ApiOkResponse({ type: LlmAnalysesResponseDto, isArray: true })
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

  @Get(':id')
  @ApiParam({ name: 'id', example: 'llm-550e8400-e29b-41d4-a716-446655440000' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreateLlmAnalysesDto })
  @ApiCreatedResponse({ type: LlmAnalysesResponseDto })
  create(@Body() dto: CreateLlmAnalysesDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateLlmAnalysesDto })
  update(@Param('id') id: string, @Body() dto: UpdateLlmAnalysesDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    schema: { example: { message: 'LLM analysis deleted successfully' } },
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
