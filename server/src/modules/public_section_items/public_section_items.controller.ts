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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePublicSectionItemsDto } from './dto/create_public_section_items.dto';
import { PublicSectionItemsResponseDto } from './dto/public_section_items_response.dto';
import { UpdatePublicSectionItemsDto } from './dto/update_public_section_items.dto';
import { PublicSectionItemsService } from './public_section_items.service';

@ApiTags('Public Section Items')
@Controller('public_section_items')
export class PublicSectionItemsController {
  constructor(private readonly service: PublicSectionItemsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated public section items' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPaginated(Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('all')
  @ApiOkResponse({ type: PublicSectionItemsResponseDto, isArray: true })
  findAll() {
    return this.service.findAll();
  }

  @Get('search')
  @ApiQuery({ name: 'q', required: false, example: 'shield' })
  @ApiOkResponse({ type: PublicSectionItemsResponseDto, isArray: true })
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  @Get('section/:sectionId')
  @ApiParam({
    name: 'sectionId',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ type: PublicSectionItemsResponseDto, isArray: true })
  findBySectionId(@Param('sectionId') sectionId: string) {
    return this.service.findBySectionId(sectionId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ type: PublicSectionItemsResponseDto })
  @ApiNotFoundResponse({ description: 'Public section item not found' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreatePublicSectionItemsDto })
  @ApiCreatedResponse({ type: PublicSectionItemsResponseDto })
  @ApiNotFoundResponse({ description: 'Public section not found' })
  create(@Body() dto: CreatePublicSectionItemsDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiBody({ type: UpdatePublicSectionItemsDto })
  @ApiOkResponse({ type: PublicSectionItemsResponseDto })
  @ApiNotFoundResponse({ description: 'Public section item not found' })
  update(@Param('id') id: string, @Body() dto: UpdatePublicSectionItemsDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({
    schema: {
      example: { message: 'Public section item deleted successfully' },
    },
  })
  @ApiNotFoundResponse({ description: 'Public section item not found' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
