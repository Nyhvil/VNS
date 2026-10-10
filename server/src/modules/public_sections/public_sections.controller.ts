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
import { CreatePublicSectionsDto } from './dto/create_public_sections.dto';
import { PublicSectionsResponseDto } from './dto/public_sections_response.dto';
import { UpdatePublicSectionsDto } from './dto/update_public_sections.dto';
import { PublicSectionsService } from './public_sections.service';

@ApiTags('Public Sections')
@Controller('public_sections')
export class PublicSectionsController {
  constructor(private readonly service: PublicSectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated public sections' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findPaginated(Number(page ?? 1), Number(limit ?? 10));
  }

  @Get('all')
  @ApiOkResponse({ type: PublicSectionsResponseDto, isArray: true })
  findAll() {
    return this.service.findAll();
  }

  @Get('search')
  @ApiQuery({ name: 'q', required: false, example: 'hero' })
  @ApiOkResponse({ type: PublicSectionsResponseDto, isArray: true })
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  @Get('page/:pageId')
  @ApiParam({ name: 'pageId', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ type: PublicSectionsResponseDto, isArray: true })
  findByPageId(@Param('pageId') pageId: string) {
    return this.service.findByPageId(pageId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ type: PublicSectionsResponseDto })
  @ApiNotFoundResponse({ description: 'Public section not found' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBody({ type: CreatePublicSectionsDto })
  @ApiCreatedResponse({ type: PublicSectionsResponseDto })
  @ApiNotFoundResponse({ description: 'Public page not found' })
  @ApiConflictResponse({
    description: 'Public section key already exists in this page',
  })
  create(@Body() dto: CreatePublicSectionsDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiBody({ type: UpdatePublicSectionsDto })
  @ApiOkResponse({ type: PublicSectionsResponseDto })
  @ApiNotFoundResponse({ description: 'Public section not found' })
  @ApiConflictResponse({
    description: 'Public section key already exists in this page',
  })
  update(@Param('id') id: string, @Body() dto: UpdatePublicSectionsDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', example: '550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({
    schema: { example: { message: 'Public section deleted successfully' } },
  })
  @ApiNotFoundResponse({ description: 'Public section not found' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
