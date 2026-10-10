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
import { CreateEmailReceivedChainsDto } from './dto/create_email_received_chains.dto';
import { EmailReceivedChainsResponseDto } from './dto/email_received_chains_response.dto';
import { UpdateEmailReceivedChainsDto } from './dto/update_email_received_chains.dto';
import { EmailReceivedChainsService } from './email_received_chains.service';
import {
  ApiEmailReceivedChainBadRequestResponse,
  ApiEmailReceivedChainDeletedResponse,
  ApiEmailReceivedChainNotFoundResponse,
  ApiEmailReceivedChainsPaginatedResponse,
  EMAIL_PARSE_ID_EXAMPLE,
  EMAIL_RECEIVED_CHAIN_ID_EXAMPLE,
} from './email_received_chains.swagger';

@ApiTags('Email Received Chains')
@Controller('email_received_chains')
export class EmailReceivedChainsController {
  constructor(
    private readonly emailReceivedChainsService: EmailReceivedChainsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated email received chains' })
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
  @ApiEmailReceivedChainsPaginatedResponse()
  findPaginated(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.emailReceivedChainsService.findPaginated(
      Number(page ?? 1),
      Number(limit ?? 10),
    );
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all email received chains' })
  @ApiOkResponse({ type: EmailReceivedChainsResponseDto, isArray: true })
  findAll() {
    return this.emailReceivedChainsService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search email received chains' })
  @ApiQuery({
    name: 'q',
    required: false,
    example: 'mx.mailguard.com',
    description:
      'Matches id, email_parse_id, ip_address, mail_server, received_from, received_by, or raw_line',
  })
  @ApiOkResponse({ type: EmailReceivedChainsResponseDto, isArray: true })
  search(@Query('q') q: string) {
    return this.emailReceivedChainsService.search(q);
  }

  @Get('email_parse/:emailParseId')
  @ApiOperation({ summary: 'Get received chains by email parse ID' })
  @ApiParam({
    name: 'emailParseId',
    example: EMAIL_PARSE_ID_EXAMPLE,
    description: 'Email parse id with eml prefix',
  })
  @ApiOkResponse({ type: EmailReceivedChainsResponseDto, isArray: true })
  @ApiEmailReceivedChainBadRequestResponse()
  findByEmailParseId(@Param('emailParseId') emailParseId: string) {
    return this.emailReceivedChainsService.findByEmailParseId(emailParseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get received chain by ID' })
  @ApiParam({
    name: 'id',
    example: EMAIL_RECEIVED_CHAIN_ID_EXAMPLE,
    description: 'Email received chain id with rch prefix',
  })
  @ApiOkResponse({ type: EmailReceivedChainsResponseDto })
  @ApiEmailReceivedChainBadRequestResponse()
  @ApiEmailReceivedChainNotFoundResponse()
  findOne(@Param('id') id: string) {
    return this.emailReceivedChainsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create received chain' })
  @ApiBody({ type: CreateEmailReceivedChainsDto })
  @ApiCreatedResponse({ type: EmailReceivedChainsResponseDto })
  @ApiEmailReceivedChainBadRequestResponse()
  @ApiEmailReceivedChainNotFoundResponse()
  create(@Body() dto: CreateEmailReceivedChainsDto) {
    return this.emailReceivedChainsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update received chain' })
  @ApiParam({
    name: 'id',
    example: EMAIL_RECEIVED_CHAIN_ID_EXAMPLE,
    description: 'Email received chain id with rch prefix',
  })
  @ApiBody({ type: UpdateEmailReceivedChainsDto })
  @ApiOkResponse({ type: EmailReceivedChainsResponseDto })
  @ApiEmailReceivedChainBadRequestResponse()
  @ApiEmailReceivedChainNotFoundResponse()
  update(@Param('id') id: string, @Body() dto: UpdateEmailReceivedChainsDto) {
    return this.emailReceivedChainsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete received chain' })
  @ApiParam({
    name: 'id',
    example: EMAIL_RECEIVED_CHAIN_ID_EXAMPLE,
    description: 'Email received chain id with rch prefix',
  })
  @ApiEmailReceivedChainDeletedResponse()
  @ApiEmailReceivedChainBadRequestResponse()
  @ApiEmailReceivedChainNotFoundResponse()
  remove(@Param('id') id: string) {
    return this.emailReceivedChainsService.remove(id);
  }
}
