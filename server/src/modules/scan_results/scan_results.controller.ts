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
import { CreateScanResultsDto } from './dto/create_scan_results.dto';
import { ScanResultsResponseDto } from './dto/scan_results_response.dto';
import { UpdateScanResultsDto } from './dto/update_scan_results.dto';
import { ScanResultsService } from './scan_results.service';

@ApiTags('Scan Results')
@Controller('scan_results')
export class ScanResultsController {
  constructor(private readonly service: ScanResultsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPaginated(Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('all')
  @ApiOkResponse({ type: ScanResultsResponseDto, isArray: true })
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
  @ApiParam({ name: 'id', example: 'res-550e8400-e29b-41d4-a716-446655440000' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreateScanResultsDto })
  @ApiCreatedResponse({ type: ScanResultsResponseDto })
  create(@Body() dto: CreateScanResultsDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateScanResultsDto })
  update(@Param('id') id: string, @Body() dto: UpdateScanResultsDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    schema: { example: { message: 'Scan result deleted successfully' } },
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
