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
import { CreateScanRequestsDto } from './dto/create_scan_requests.dto';
import { ScanRequestsResponseDto } from './dto/scan_requests_response.dto';
import { ScanRequestsService } from './scan_requests.service';
import {
  ScanInputType,
  ScanStatus,
} from './interfaces/scan_requests.interface';
import { UpdateScanRequestsDto } from './dto/update_scan_requests.dto';

@ApiTags('Scan Requests')
@Controller('scan_requests')
export class ScanRequestsController {
  constructor(private readonly scanRequestsService: ScanRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated scan requests' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'user_id',
    required: false,
    example: 'usr-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({ name: 'input_type', required: false, enum: ScanInputType })
  @ApiQuery({ name: 'status', required: false, enum: ScanStatus })
  findPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('user_id') userId?: string,
    @Query('input_type') inputType?: ScanInputType,
    @Query('status') status?: ScanStatus,
  ) {
    return this.scanRequestsService.findPaginated(
      Number(page ?? 1),
      Number(limit ?? 10),
      {
        user_id: userId,
        input_type: inputType,
        status,
      },
    );
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all scan requests' })
  @ApiOkResponse({
    type: ScanRequestsResponseDto,
    isArray: true,
  })
  findAll() {
    return this.scanRequestsService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search scan requests' })
  @ApiQuery({ name: 'q', required: false, example: 'message.eml' })
  @ApiOkResponse({
    type: ScanRequestsResponseDto,
    isArray: true,
  })
  search(@Query('q') q: string) {
    return this.scanRequestsService.search(q);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get scan requests by user ID' })
  @ApiParam({
    name: 'userId',
    example: 'usr-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    type: ScanRequestsResponseDto,
    isArray: true,
  })
  findByUserId(@Param('userId') userId: string) {
    return this.scanRequestsService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scan request by ID' })
  @ApiParam({
    name: 'id',
    example: 'scn-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ type: ScanRequestsResponseDto })
  @ApiNotFoundResponse({ description: 'Scan request not found' })
  findOne(@Param('id') id: string) {
    return this.scanRequestsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create scan request' })
  @ApiBody({ type: CreateScanRequestsDto })
  @ApiCreatedResponse({ type: ScanRequestsResponseDto })
  @ApiNotFoundResponse({ description: 'User not found' })
  create(@Body() dto: CreateScanRequestsDto) {
    return this.scanRequestsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update scan request' })
  @ApiParam({
    name: 'id',
    example: 'scn-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateScanRequestsDto })
  @ApiOkResponse({ type: ScanRequestsResponseDto })
  @ApiNotFoundResponse({ description: 'Scan request not found' })
  update(@Param('id') id: string, @Body() dto: UpdateScanRequestsDto) {
    return this.scanRequestsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update scan request status' })
  @ApiParam({
    name: 'id',
    example: 'scn-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    schema: {
      properties: {
        status: {
          enum: Object.values(ScanStatus),
          example: ScanStatus.SUCCESS,
        },
        error_message: { type: 'string', example: 'Parser failed' },
      },
      required: ['status'],
    },
  })
  @ApiOkResponse({ type: ScanRequestsResponseDto })
  @ApiNotFoundResponse({ description: 'Scan request not found' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ScanStatus,
    @Body('error_message') errorMessage?: string,
  ) {
    return this.scanRequestsService.updateStatus(id, status, errorMessage);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete scan request' })
  @ApiParam({
    name: 'id',
    example: 'scn-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    schema: {
      example: {
        message: 'Scan request deleted successfully',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Scan request not found' })
  remove(@Param('id') id: string) {
    return this.scanRequestsService.remove(id);
  }
}
