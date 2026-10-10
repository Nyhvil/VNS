import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt_auth.guard';
import { AnalyzeService } from './analyze.service';
import { AnalyzeRequestDto } from './dto/analyze_request.dto';
import {
  AnalyzeFullResponseDto,
  AnalyzeJobResponseDto,
  AnalyzeResultResponseDto,
} from './dto/analyze_response.dto';

@ApiTags('Analyze')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analyze')
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  // ============================================================
  // POST /api/analyze — main entry point
  // ============================================================

  @Post()
  @ApiBody({ type: AnalyzeRequestDto })
  @ApiCreatedResponse({
    type: AnalyzeFullResponseDto,
    description: 'Analysis complete — returns job + result',
  })
  analyze(@Body() dto: AnalyzeRequestDto): Promise<AnalyzeFullResponseDto> {
    return this.analyzeService.analyze(dto);
  }

  // ============================================================
  // GET /api/analyze/jobs
  // ============================================================

  @Get('jobs')
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findAllJobs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.analyzeService.findAllJobs(
      Number(page ?? 1),
      Number(limit ?? 10),
    );
  }

  // ============================================================
  // GET /api/analyze/jobs/:id
  // ============================================================

  @Get('jobs/:id')
  @ApiParam({ name: 'id', example: 'job-550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ type: AnalyzeJobResponseDto })
  findJobById(@Param('id') id: string): Promise<AnalyzeJobResponseDto> {
    return this.analyzeService.findJobById(id);
  }

  // ============================================================
  // GET /api/analyze/jobs/:id/result
  // ============================================================

  @Get('jobs/:id/result')
  @ApiParam({ name: 'id', example: 'job-550e8400-e29b-41d4-a716-446655440000' })
  @ApiOkResponse({ type: AnalyzeResultResponseDto })
  findResultByJobId(
    @Param('id') id: string,
  ): Promise<AnalyzeResultResponseDto> {
    return this.analyzeService.findResultByJobId(id);
  }

  // ============================================================
  // GET /api/analyze/scan/:scanId/jobs
  // ============================================================

  @Get('scan/:scanId/jobs')
  @ApiParam({
    name: 'scanId',
    example: 'scn-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ type: AnalyzeJobResponseDto, isArray: true })
  findJobsByScanId(
    @Param('scanId') scanId: string,
  ): Promise<AnalyzeJobResponseDto[]> {
    return this.analyzeService.findJobsByScanId(scanId);
  }

  // ============================================================
  // GET /api/analyze/scan/:scanId/results
  // ============================================================

  @Get('scan/:scanId/results')
  @ApiParam({
    name: 'scanId',
    example: 'scn-550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ type: AnalyzeResultResponseDto, isArray: true })
  findResultsByScanId(
    @Param('scanId') scanId: string,
  ): Promise<AnalyzeResultResponseDto[]> {
    return this.analyzeService.findResultsByScanId(scanId);
  }
}
