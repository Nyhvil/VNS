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
import { CreateRuleDetectionsDto } from './dto/create_rule_detections.dto';
import { RuleDetectionsResponseDto } from './dto/rule_detections_response.dto';
import { UpdateRuleDetectionsDto } from './dto/update_rule_detections.dto';
import { RuleDetectionsService } from './rule_detections.service';

@ApiTags('Rule Detections')
@Controller('rule_detections')
export class RuleDetectionsController {
  constructor(private readonly service: RuleDetectionsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPaginated(Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('all')
  @ApiOkResponse({ type: RuleDetectionsResponseDto, isArray: true })
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
  @ApiParam({ name: 'id', example: 'rul-550e8400-e29b-41d4-a716-446655440000' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreateRuleDetectionsDto })
  @ApiCreatedResponse({ type: RuleDetectionsResponseDto })
  create(@Body() dto: CreateRuleDetectionsDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateRuleDetectionsDto })
  update(@Param('id') id: string, @Body() dto: UpdateRuleDetectionsDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    schema: { example: { message: 'Rule detection deleted successfully' } },
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
