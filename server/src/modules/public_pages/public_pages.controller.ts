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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreatePublicPagesDto } from './dto/create_public_pages.dto';
import { PublicPagesResponseDto } from './dto/public_pages_response.dto';
import { UpdatePublicPagesDto } from './dto/update_public_pages.dto';
import { PublicPagesService } from './public_pages.service';

@ApiTags('Public Pages')
@Controller('public_pages')
export class PublicPagesController {
  constructor(private readonly service: PublicPagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated public pages' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPaginated(Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('all')
  @ApiOkResponse({ type: PublicPagesResponseDto, isArray: true })
  findAll() {
    return this.service.findAll();
  }

  @Get('search')
  @ApiQuery({ name: 'q', required: false, example: 'home' })
  @ApiOkResponse({ type: PublicPagesResponseDto, isArray: true })
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  @Get('slug/:slug')
  @ApiParam({ name: 'slug', example: 'home' })
  @ApiOkResponse({ type: PublicPagesResponseDto })
  @ApiNotFoundResponse({ description: 'Public page not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ type: PublicPagesResponseDto })
  @ApiNotFoundResponse({ description: 'Public page not found' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreatePublicPagesDto })
  @ApiCreatedResponse({ type: PublicPagesResponseDto })
  @ApiConflictResponse({ description: 'Public page slug already exists' })
  create(@Body() dto: CreatePublicPagesDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiBody({ type: UpdatePublicPagesDto })
  @ApiOkResponse({ type: PublicPagesResponseDto })
  @ApiNotFoundResponse({ description: 'Public page not found' })
  @ApiConflictResponse({ description: 'Public page slug already exists' })
  update(@Param('id') id: string, @Body() dto: UpdatePublicPagesDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({
    schema: { example: { message: 'Public page deleted successfully' } },
  })
  @ApiNotFoundResponse({ description: 'Public page not found' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
