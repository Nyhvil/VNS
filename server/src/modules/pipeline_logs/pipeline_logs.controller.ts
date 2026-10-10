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
import { CreatePipelineLogsDto } from './dto/create_pipeline_logs.dto';
import { PipelineLogsResponseDto } from './dto/pipeline_logs_response.dto';
import { UpdatePipelineLogsDto } from './dto/update_pipeline_logs.dto';
import { PipelineLogsService } from './pipeline_logs.service';

@ApiTags('Pipeline Logs')
@Controller('pipeline_logs')
export class PipelineLogsController {
  constructor(private readonly service: PipelineLogsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPaginated(Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('all')
  @ApiOkResponse({ type: PipelineLogsResponseDto, isArray: true })
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
  @ApiParam({ name: 'id', example: 'log-550e8400-e29b-41d4-a716-446655440000' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreatePipelineLogsDto })
  @ApiCreatedResponse({ type: PipelineLogsResponseDto })
  create(@Body() dto: CreatePipelineLogsDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBody({ type: UpdatePipelineLogsDto })
  update(@Param('id') id: string, @Body() dto: UpdatePipelineLogsDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    schema: { example: { message: 'Pipeline log deleted successfully' } },
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
