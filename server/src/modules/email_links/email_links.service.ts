import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreateEmailLinksDto } from './dto/create_email_links.dto';
import { EmailLinksResponseDto } from './dto/email_links_response.dto';
import { UpdateEmailLinksDto } from './dto/update_email_links.dto';
import { EmailLinksRow } from './interfaces/email_links.interface';

@Injectable()
export class EmailLinksService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async findAll(): Promise<EmailLinksResponseDto[]> {
    const result = await this.pool.query<EmailLinksRow>(`
      SELECT *
      FROM email_links
      ORDER BY created_at DESC;
    `);

    return result.rows.map((link) => new EmailLinksResponseDto(link));
  }

  async findPaginated(
    page = 1,
    limit = 10,
  ): Promise<{
    data: EmailLinksResponseDto[];
    meta: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const safePage = Math.max(Number(page), 1);
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<EmailLinksRow>(
        `
        SELECT *
        FROM email_links
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
        `,
        [safeLimit, offset],
      ),
      this.pool.query<{ total: string }>(`
        SELECT COUNT(*) AS total
        FROM email_links;
      `),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: dataResult.rows.map((link) => new EmailLinksResponseDto(link)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<EmailLinksResponseDto> {
    const link = await this.findRowById(id);
    return new EmailLinksResponseDto(link);
  }

  async findByScanId(scanId: string): Promise<EmailLinksResponseDto[]> {
    this.validateScanRequestId(scanId);

    const result = await this.pool.query<EmailLinksRow>(
      `
      SELECT *
      FROM email_links
      WHERE scan_id = $1
      ORDER BY created_at DESC;
      `,
      [scanId],
    );

    return result.rows.map((link) => new EmailLinksResponseDto(link));
  }

  async findByEmailParseId(
    emailParseId: string,
  ): Promise<EmailLinksResponseDto[]> {
    this.validateEmailParseId(emailParseId);

    const result = await this.pool.query<EmailLinksRow>(
      `
      SELECT *
      FROM email_links
      WHERE email_parse_id = $1
      ORDER BY created_at DESC;
      `,
      [emailParseId],
    );

    return result.rows.map((link) => new EmailLinksResponseDto(link));
  }

  async search(keyword: string): Promise<EmailLinksResponseDto[]> {
    const q = keyword?.trim();

    if (!q) {
      return this.findAll();
    }

    const result = await this.pool.query<EmailLinksRow>(
      `
      SELECT *
      FROM email_links
      WHERE
        id ILIKE $1
        OR scan_id ILIKE $1
        OR email_parse_id ILIKE $1
        OR original_url ILIKE $1
        OR display_text ILIKE $1
        OR domain ILIKE $1
      ORDER BY created_at DESC;
      `,
      [`%${q}%`],
    );

    return result.rows.map((link) => new EmailLinksResponseDto(link));
  }

  async create(dto: CreateEmailLinksDto): Promise<EmailLinksResponseDto> {
    this.validateScanRequestId(dto.scan_id);

    if (dto.email_parse_id) {
      this.validateEmailParseId(dto.email_parse_id);
    }

    try {
      const result = await this.pool.query<EmailLinksRow>(
        `
        INSERT INTO email_links (
          scan_id,
          email_parse_id,
          original_url,
          display_text,
          domain,
          is_shortened,
          is_suspicious,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, FALSE), COALESCE($7, FALSE), $8)
        RETURNING *;
        `,
        [
          dto.scan_id,
          dto.email_parse_id ?? null,
          dto.original_url,
          dto.display_text ?? null,
          dto.domain ?? null,
          dto.is_shortened ?? null,
          dto.is_suspicious ?? null,
          dto.metadata ?? null,
        ],
      );

      return new EmailLinksResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateEmailLinksDto,
  ): Promise<EmailLinksResponseDto> {
    const current = await this.findRowById(id);

    if (dto.scan_id) {
      this.validateScanRequestId(dto.scan_id);
    }

    if (dto.email_parse_id) {
      this.validateEmailParseId(dto.email_parse_id);
    }

    try {
      const result = await this.pool.query<EmailLinksRow>(
        `
        UPDATE email_links
        SET
          scan_id = $1,
          email_parse_id = $2,
          original_url = $3,
          display_text = $4,
          domain = $5,
          is_shortened = $6,
          is_suspicious = $7,
          metadata = $8
        WHERE id = $9
        RETURNING *;
        `,
        [
          dto.scan_id ?? current.scan_id,
          dto.email_parse_id ?? current.email_parse_id,
          dto.original_url ?? current.original_url,
          dto.display_text ?? current.display_text,
          dto.domain ?? current.domain,
          dto.is_shortened ?? current.is_shortened,
          dto.is_suspicious ?? current.is_suspicious,
          dto.metadata ?? current.metadata,
          id,
        ],
      );

      return new EmailLinksResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    this.validateEmailLinkId(id);

    const result = await this.pool.query<EmailLinksRow>(
      `
      DELETE FROM email_links
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Email link not found');
    }

    return { message: 'Email link deleted successfully' };
  }

  private async findRowById(id: string): Promise<EmailLinksRow> {
    this.validateEmailLinkId(id);

    const result = await this.pool.query<EmailLinksRow>(
      `
      SELECT *
      FROM email_links
      WHERE id = $1;
      `,
      [id],
    );

    const link = result.rows[0];

    if (!link) {
      throw new NotFoundException('Email link not found');
    }

    return link;
  }

  private validateEmailLinkId(id: string): void {
    if (!/^lnk-[0-9a-f-]{36}$/.test(id)) {
      throw new BadRequestException('Invalid email link id format');
    }
  }

  private validateScanRequestId(id: string): void {
    if (!/^scn-[0-9a-f-]{36}$/.test(id)) {
      throw new BadRequestException('Invalid scan request id format');
    }
  }

  private validateEmailParseId(id: string): void {
    if (!/^eml-[0-9a-f-]{36}$/.test(id)) {
      throw new BadRequestException('Invalid email parse id format');
    }
  }

  private handleWriteError(error: unknown): never {
    if (this.isForeignKeyViolation(error)) {
      throw new NotFoundException('Scan request or email parse not found');
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
