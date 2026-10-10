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
import { CreateEmailParsesDto } from './dto/create_email_parses.dto';
import { EmailParsesResponseDto } from './dto/email_parses_response.dto';
import { EmailParsesService } from './email_parses.service';
import { UpdateEmailParsesDto } from './dto/update_email_parses.dto';

@ApiTags('Email Parses')
@Controller('email_parses')
export class EmailParsesController {
  constructor(private readonly emailParsesService: EmailParsesService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated email parses' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.emailParsesService.findPaginated(
      Number(page ?? 1),
      Number(limit ?? 10),
    );
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all email parses' })
  @ApiOkResponse({
    type: EmailParsesResponseDto,
    isArray: true,
  })
  findAll() {
    return this.emailParsesService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search email parses' })
  @ApiQuery({ name: 'q', required: false, example: 'example.com' })
  @ApiOkResponse({
    type: EmailParsesResponseDto,
    isArray: true,
  })
  search(@Query('q') q: string) {
    return this.emailParsesService.search(q);
  }

  @Get('scan/:scanId')
  @ApiOperation({ summary: 'Get email parse by scan ID' })
  @ApiParam({
    name: 'scanId',
    example: 'scn-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ type: EmailParsesResponseDto })
  @ApiNotFoundResponse({ description: 'Email parse not found' })
  findByScanId(@Param('scanId') scanId: string) {
    return this.emailParsesService.findByScanId(scanId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email parse by ID' })
  @ApiParam({
    name: 'id',
    example: 'eml-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ type: EmailParsesResponseDto })
  @ApiNotFoundResponse({ description: 'Email parse not found' })
  findOne(@Param('id') id: string) {
    return this.emailParsesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create email parse' })
  @ApiBody({ type: CreateEmailParsesDto })
  @ApiCreatedResponse({ type: EmailParsesResponseDto })
  @ApiConflictResponse({
    description: 'Email parse already exists for this scan',
  })
  @ApiNotFoundResponse({ description: 'Scan request not found' })
  create(@Body() dto: CreateEmailParsesDto) {
    return this.emailParsesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update email parse' })
  @ApiParam({
    name: 'id',
    example: 'eml-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateEmailParsesDto })
  @ApiOkResponse({ type: EmailParsesResponseDto })
  @ApiNotFoundResponse({ description: 'Email parse not found' })
  update(@Param('id') id: string, @Body() dto: UpdateEmailParsesDto) {
    return this.emailParsesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete email parse' })
  @ApiParam({
    name: 'id',
    example: 'eml-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    schema: {
      example: {
        message: 'Email parse deleted successfully',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Email parse not found' })
  remove(@Param('id') id: string) {
    return this.emailParsesService.remove(id);
  }
}
