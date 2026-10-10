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
import { CreateEmailAttachmentsDto } from './dto/create_email_attachments.dto';
import { EmailAttachmentsResponseDto } from './dto/email_attachments_response.dto';
import { UpdateEmailAttachmentsDto } from './dto/update_email_attachments.dto';
import { EmailAttachmentsService } from './email_attachments.service';
import {
  ApiEmailAttachmentBadRequestResponse,
  ApiEmailAttachmentDeletedResponse,
  ApiEmailAttachmentNotFoundResponse,
  ApiEmailAttachmentsPaginatedResponse,
  EMAIL_ATTACHMENT_ID_EXAMPLE,
  EMAIL_PARSE_ID_EXAMPLE,
} from './email_attachments.swagger';

@ApiTags('Email Attachments')
@Controller('email_attachments')
export class EmailAttachmentsController {
  constructor(
    private readonly emailAttachmentsService: EmailAttachmentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated email attachments' })
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
  @ApiEmailAttachmentsPaginatedResponse()
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.emailAttachmentsService.findPaginated(
      Number(page ?? 1),
      Number(limit ?? 10),
    );
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all email attachments' })
  @ApiOkResponse({ type: EmailAttachmentsResponseDto, isArray: true })
  findAll() {
    return this.emailAttachmentsService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search email attachments' })
  @ApiQuery({
    name: 'q',
    required: false,
    example: 'invoice.pdf',
    description:
      'Matches id, email_parse_id, file_name, mime_type, file_url, or extracted_text',
  })
  @ApiOkResponse({ type: EmailAttachmentsResponseDto, isArray: true })
  search(@Query('q') q: string) {
    return this.emailAttachmentsService.search(q);
  }

  @Get('email_parse/:emailParseId')
  @ApiOperation({ summary: 'Get attachments by email parse ID' })
  @ApiParam({
    name: 'emailParseId',
    example: EMAIL_PARSE_ID_EXAMPLE,
    description: 'Email parse id with eml prefix',
  })
  @ApiOkResponse({ type: EmailAttachmentsResponseDto, isArray: true })
  @ApiEmailAttachmentBadRequestResponse()
  findByEmailParseId(@Param('emailParseId') emailParseId: string) {
    return this.emailAttachmentsService.findByEmailParseId(emailParseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email attachment by ID' })
  @ApiParam({
    name: 'id',
    example: EMAIL_ATTACHMENT_ID_EXAMPLE,
    description: 'Email attachment id with att prefix',
  })
  @ApiOkResponse({ type: EmailAttachmentsResponseDto })
  @ApiEmailAttachmentBadRequestResponse()
  @ApiEmailAttachmentNotFoundResponse()
  findOne(@Param('id') id: string) {
    return this.emailAttachmentsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create email attachment' })
  @ApiBody({ type: CreateEmailAttachmentsDto })
  @ApiCreatedResponse({ type: EmailAttachmentsResponseDto })
  @ApiEmailAttachmentBadRequestResponse()
  @ApiEmailAttachmentNotFoundResponse()
  create(@Body() dto: CreateEmailAttachmentsDto) {
    return this.emailAttachmentsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update email attachment' })
  @ApiParam({
    name: 'id',
    example: EMAIL_ATTACHMENT_ID_EXAMPLE,
    description: 'Email attachment id with att prefix',
  })
  @ApiBody({ type: UpdateEmailAttachmentsDto })
  @ApiOkResponse({ type: EmailAttachmentsResponseDto })
  @ApiEmailAttachmentBadRequestResponse()
  @ApiEmailAttachmentNotFoundResponse()
  update(@Param('id') id: string, @Body() dto: UpdateEmailAttachmentsDto) {
    return this.emailAttachmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete email attachment' })
  @ApiParam({
    name: 'id',
    example: EMAIL_ATTACHMENT_ID_EXAMPLE,
    description: 'Email attachment id with att prefix',
  })
  @ApiEmailAttachmentDeletedResponse()
  @ApiEmailAttachmentBadRequestResponse()
  @ApiEmailAttachmentNotFoundResponse()
  remove(@Param('id') id: string) {
    return this.emailAttachmentsService.remove(id);
  }
}
