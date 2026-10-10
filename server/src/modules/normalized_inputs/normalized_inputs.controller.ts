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
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateNormalizedInputsDto } from './dto/create_normalized_inputs.dto';
import { NormalizedInputsResponseDto } from './dto/normalized_inputs_response.dto';
import { UpdateNormalizedInputsDto } from './dto/update_normalized_inputs.dto';
import { NormalizedInputsService } from './normalized_inputs.service';

@ApiTags('Normalized Inputs')
@Controller('normalized_inputs')
export class NormalizedInputsController {
  constructor(private readonly service: NormalizedInputsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated normalized inputs' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPaginated(Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('all')
  @ApiOkResponse({ type: NormalizedInputsResponseDto, isArray: true })
  findAll() {
    return this.service.findAll();
  }

  @Get('search')
  @ApiQuery({ name: 'q', required: false, example: 'verify' })
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  @Get('scan/:scanId')
  findByScanId(@Param('scanId') scanId: string) {
    return this.service.findByScanId(scanId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: 'nor-550e8400-e29b-41d4-a716-446655440000' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreateNormalizedInputsDto })
  @ApiCreatedResponse({ type: NormalizedInputsResponseDto })
  create(@Body() dto: CreateNormalizedInputsDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateNormalizedInputsDto })
  update(@Param('id') id: string, @Body() dto: UpdateNormalizedInputsDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    schema: { example: { message: 'Normalized input deleted successfully' } },
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
