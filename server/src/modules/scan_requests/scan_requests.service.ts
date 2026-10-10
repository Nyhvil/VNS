import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreateScanRequestsDto } from './dto/create_scan_requests.dto';
import { UpdateScanRequestsDto } from './dto/update_scan_requests.dto';
import { ScanRequestsResponseDto } from './dto/scan_requests_response.dto';
import {
  ScanInputType,
  ScanRequestsRow,
  ScanStatus,
} from './interfaces/scan_requests.interface';

@Injectable()
export class ScanRequestsService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async findAll(): Promise<ScanRequestsResponseDto[]> {
    const result = await this.pool.query<ScanRequestsRow>(`
      SELECT *
      FROM scan_requests
      ORDER BY created_at DESC;
    `);

    return result.rows.map((scan) => new ScanRequestsResponseDto(scan));
  }

  async findPaginated(
    page = 1,
    limit = 10,
    filters: {
      user_id?: string;
      input_type?: ScanInputType;
      status?: ScanStatus;
    } = {},
  ): Promise<{
    data: ScanRequestsResponseDto[];
    meta: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    const safePage = Math.max(Number(page), 1);
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const offset = (safePage - 1) * safeLimit;
    const { whereClause, values } = this.buildFilterClause(filters);

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<ScanRequestsRow>(
        `
        SELECT *
        FROM scan_requests
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2};
        `,
        [...values, safeLimit, offset],
      ),
      this.pool.query<{ total: string }>(
        `
        SELECT COUNT(*) AS total
        FROM scan_requests
        ${whereClause};
        `,
        values,
      ),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: dataResult.rows.map((scan) => new ScanRequestsResponseDto(scan)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<ScanRequestsResponseDto> {
    const scan = await this.findRowById(id);

    return new ScanRequestsResponseDto(scan);
  }

  async findByUserId(userId: string): Promise<ScanRequestsResponseDto[]> {
    this.validateUserId(userId);

    const result = await this.pool.query<ScanRequestsRow>(
      `
      SELECT *
      FROM scan_requests
      WHERE user_id = $1
      ORDER BY created_at DESC;
      `,
      [userId],
    );

    return result.rows.map((scan) => new ScanRequestsResponseDto(scan));
  }

  async search(keyword: string): Promise<ScanRequestsResponseDto[]> {
    const q = keyword?.trim();

    if (!q) {
      return this.findAll();
    }

    const result = await this.pool.query<ScanRequestsRow>(
      `
      SELECT *
      FROM scan_requests
      WHERE
        id ILIKE $1
        OR user_id ILIKE $1
        OR input_type::TEXT ILIKE $1
        OR status::TEXT ILIKE $1
        OR original_text ILIKE $1
        OR original_url ILIKE $1
        OR file_name ILIKE $1
        OR file_mime_type ILIKE $1
        OR file_url ILIKE $1
        OR error_message ILIKE $1
      ORDER BY created_at DESC;
      `,
      [`%${q}%`],
    );

    return result.rows.map((scan) => new ScanRequestsResponseDto(scan));
  }

  async create(dto: CreateScanRequestsDto): Promise<ScanRequestsResponseDto> {
    if (dto.user_id) {
      this.validateUserId(dto.user_id);
    }

    this.validateScanInputType(dto.input_type);

    if (dto.status) {
      this.validateScanStatus(dto.status);
    }

    try {
      const result = await this.pool.query<ScanRequestsRow>(
        `
        INSERT INTO scan_requests (
          user_id,
          input_type,
          status,
          original_text,
          original_url,
          file_name,
          file_mime_type,
          file_size,
          file_url,
          error_message
        )
        VALUES (
          $1,
          $2::scan_input_type,
          COALESCE($3::scan_status, 'pending'::scan_status),
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10
        )
        RETURNING *;
        `,
        [
          dto.user_id ?? null,
          dto.input_type,
          dto.status ?? null,
          dto.original_text ?? null,
          dto.original_url ?? null,
          dto.file_name ?? null,
          dto.file_mime_type ?? null,
          dto.file_size ?? null,
          dto.file_url ?? null,
          dto.error_message ?? null,
        ],
      );

      return new ScanRequestsResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateScanRequestsDto,
  ): Promise<ScanRequestsResponseDto> {
    const current = await this.findRowById(id);

    if (dto.user_id) {
      this.validateUserId(dto.user_id);
    }

    if (dto.input_type) {
      this.validateScanInputType(dto.input_type);
    }

    if (dto.status) {
      this.validateScanStatus(dto.status);
    }

    try {
      const result = await this.pool.query<ScanRequestsRow>(
        `
        UPDATE scan_requests
        SET
          user_id = $1,
          input_type = $2::scan_input_type,
          status = $3::scan_status,
          original_text = $4,
          original_url = $5,
          file_name = $6,
          file_mime_type = $7,
          file_size = $8,
          file_url = $9,
          error_message = $10,
          updated_at = NOW()
        WHERE id = $11
        RETURNING *;
        `,
        [
          dto.user_id ?? current.user_id,
          dto.input_type ?? current.input_type,
          dto.status ?? current.status,
          dto.original_text ?? current.original_text,
          dto.original_url ?? current.original_url,
          dto.file_name ?? current.file_name,
          dto.file_mime_type ?? current.file_mime_type,
          dto.file_size ?? current.file_size,
          dto.file_url ?? current.file_url,
          dto.error_message ?? current.error_message,
          id,
        ],
      );

      return new ScanRequestsResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async updateStatus(
    id: string,
    status: ScanStatus,
    errorMessage?: string,
  ): Promise<ScanRequestsResponseDto> {
    this.validateScanRequestId(id);
    this.validateScanStatus(status);

    const result = await this.pool.query<ScanRequestsRow>(
      `
      UPDATE scan_requests
      SET
        status = $1::scan_status,
        error_message = $2,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *;
      `,
      [status, errorMessage ?? null, id],
    );

    const scan = result.rows[0];

    if (!scan) {
      throw new NotFoundException('Scan request not found');
    }

    return new ScanRequestsResponseDto(scan);
  }

  async remove(id: string): Promise<{ message: string }> {
    this.validateScanRequestId(id);

    const result = await this.pool.query<ScanRequestsRow>(
      `
      DELETE FROM scan_requests
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Scan request not found');
    }

    return {
      message: 'Scan request deleted successfully',
    };
  }

  private async findRowById(id: string): Promise<ScanRequestsRow> {
    this.validateScanRequestId(id);

    const result = await this.pool.query<ScanRequestsRow>(
      `
      SELECT *
      FROM scan_requests
      WHERE id = $1;
      `,
      [id],
    );

    const scan = result.rows[0];

    if (!scan) {
      throw new NotFoundException('Scan request not found');
    }

    return scan;
  }

  private buildFilterClause(filters: {
    user_id?: string;
    input_type?: ScanInputType;
    status?: ScanStatus;
  }): { whereClause: string; values: string[] } {
    const clauses: string[] = [];
    const values: string[] = [];

    if (filters.user_id) {
      this.validateUserId(filters.user_id);
      values.push(filters.user_id);
      clauses.push(`user_id = $${values.length}`);
    }

    if (filters.input_type) {
      this.validateScanInputType(filters.input_type);
      values.push(filters.input_type);
      clauses.push(`input_type = $${values.length}::scan_input_type`);
    }

    if (filters.status) {
      this.validateScanStatus(filters.status);
      values.push(filters.status);
      clauses.push(`status = $${values.length}::scan_status`);
    }

    return {
      whereClause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
      values,
    };
  }

  private validateScanRequestId(id: string): void {
    const isValid = /^scn-[0-9a-f-]{36}$/.test(id);

    if (!isValid) {
      throw new BadRequestException('Invalid scan request id format');
    }
  }

  private validateUserId(id: string): void {
    const isValid = /^usr-[0-9a-f-]{36}$/.test(id);

    if (!isValid) {
      throw new BadRequestException('Invalid user id format');
    }
  }

  private validateScanInputType(inputType: ScanInputType): void {
    const isValid = Object.values(ScanInputType).includes(inputType);

    if (!isValid) {
      throw new BadRequestException('Invalid scan input type');
    }
  }

  private validateScanStatus(status: ScanStatus): void {
    const isValid = Object.values(ScanStatus).includes(status);

    if (!isValid) {
      throw new BadRequestException('Invalid scan status');
    }
  }

  private handleWriteError(error: unknown): never {
    if (this.isForeignKeyViolation(error)) {
      throw new NotFoundException('User not found');
    }

    throw error;
  }

  private isForeignKeyViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23503'
    );
  }
}
