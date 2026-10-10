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
import { CreateImageAnalysesDto } from './dto/create_image_analyses.dto';
import { ImageAnalysesResponseDto } from './dto/image_analyses_response.dto';
import { UpdateImageAnalysesDto } from './dto/update_image_analyses.dto';
import { ImageAnalysesService } from './image_analyses.service';

@ApiTags('Image Analyses')
@Controller('image_analyses')
export class ImageAnalysesController {
  constructor(private readonly service: ImageAnalysesService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated image analyses' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPaginated(Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('all')
  @ApiOkResponse({ type: ImageAnalysesResponseDto, isArray: true })
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
  @ApiParam({ name: 'id', example: 'img-550e8400-e29b-41d4-a716-446655440000' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreateImageAnalysesDto })
  @ApiCreatedResponse({ type: ImageAnalysesResponseDto })
  create(@Body() dto: CreateImageAnalysesDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateImageAnalysesDto })
  update(@Param('id') id: string, @Body() dto: UpdateImageAnalysesDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({
    schema: { example: { message: 'Image analysis deleted successfully' } },
  })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
