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
import { CreateEmailLinksDto } from './dto/create_email_links.dto';
import { EmailLinksResponseDto } from './dto/email_links_response.dto';
import { UpdateEmailLinksDto } from './dto/update_email_links.dto';
import { EmailLinksService } from './email_links.service';
import {
  ApiEmailLinkBadRequestResponse,
  ApiEmailLinkDeletedResponse,
  ApiEmailLinkNotFoundResponse,
  ApiEmailLinksPaginatedResponse,
  EMAIL_LINK_ID_EXAMPLE,
  EMAIL_PARSE_ID_EXAMPLE,
  SCAN_REQUEST_ID_EXAMPLE,
} from './email_links.swagger';

@ApiTags('Email Links')
@Controller('email_links')
export class EmailLinksController {
  constructor(private readonly emailLinksService: EmailLinksService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated email links' })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number, minimum 1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Items per page, between 1 and 100',
  })
  @ApiEmailLinksPaginatedResponse()
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.emailLinksService.findPaginated(
      Number(page ?? 1),
      Number(limit ?? 10),
    );
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all email links' })
  @ApiOkResponse({ type: EmailLinksResponseDto, isArray: true })
  findAll() {
    return this.emailLinksService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search email links' })
  @ApiQuery({
    name: 'q',
    required: false,
    example: 'example.com',
    description:
      'Matches id, scan_id, email_parse_id, original_url, display_text, or domain',
  })
  @ApiOkResponse({ type: EmailLinksResponseDto, isArray: true })
  search(@Query('q') q: string) {
    return this.emailLinksService.search(q);
  }

  @Get('scan/:scanId')
  @ApiOperation({ summary: 'Get email links by scan ID' })
  @ApiParam({
    name: 'scanId',
    example: SCAN_REQUEST_ID_EXAMPLE,
    description: 'Scan request id with scn prefix',
  })
  @ApiOkResponse({ type: EmailLinksResponseDto, isArray: true })
  @ApiEmailLinkBadRequestResponse()
  findByScanId(@Param('scanId') scanId: string) {
    return this.emailLinksService.findByScanId(scanId);
  }

  @Get('email_parse/:emailParseId')
  @ApiOperation({ summary: 'Get email links by email parse ID' })
  @ApiParam({
    name: 'emailParseId',
    example: EMAIL_PARSE_ID_EXAMPLE,
    description: 'Email parse id with eml prefix',
  })
  @ApiOkResponse({ type: EmailLinksResponseDto, isArray: true })
  @ApiEmailLinkBadRequestResponse()
  findByEmailParseId(@Param('emailParseId') emailParseId: string) {
    return this.emailLinksService.findByEmailParseId(emailParseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email link by ID' })
  @ApiParam({
    name: 'id',
    example: EMAIL_LINK_ID_EXAMPLE,
    description: 'Email link id with lnk prefix',
  })
  @ApiOkResponse({ type: EmailLinksResponseDto })
  @ApiEmailLinkBadRequestResponse()
  @ApiEmailLinkNotFoundResponse()
  findOne(@Param('id') id: string) {
    return this.emailLinksService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create email link' })
  @ApiBody({ type: CreateEmailLinksDto })
  @ApiCreatedResponse({ type: EmailLinksResponseDto })
  @ApiEmailLinkBadRequestResponse()
  @ApiEmailLinkNotFoundResponse()
  create(@Body() dto: CreateEmailLinksDto) {
    return this.emailLinksService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update email link' })
  @ApiParam({
    name: 'id',
    example: EMAIL_LINK_ID_EXAMPLE,
    description: 'Email link id with lnk prefix',
  })
  @ApiBody({ type: UpdateEmailLinksDto })
  @ApiOkResponse({ type: EmailLinksResponseDto })
  @ApiEmailLinkBadRequestResponse()
  @ApiEmailLinkNotFoundResponse()
  update(@Param('id') id: string, @Body() dto: UpdateEmailLinksDto) {
    return this.emailLinksService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete email link' })
  @ApiParam({
    name: 'id',
    example: EMAIL_LINK_ID_EXAMPLE,
    description: 'Email link id with lnk prefix',
  })
  @ApiEmailLinkDeletedResponse()
  @ApiEmailLinkBadRequestResponse()
  @ApiEmailLinkNotFoundResponse()
  remove(@Param('id') id: string) {
    return this.emailLinksService.remove(id);
  }
}
