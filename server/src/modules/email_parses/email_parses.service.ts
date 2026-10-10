import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreateEmailParsesDto } from './dto/create_email_parses.dto';
import { EmailParsesResponseDto } from './dto/email_parses_response.dto';
import { EmailParsesRow } from './interfaces/email_parses.interface';
import { UpdateEmailParsesDto } from './dto/update_email_parses.dto';

@Injectable()
export class EmailParsesService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async findAll(): Promise<EmailParsesResponseDto[]> {
    const result = await this.pool.query<EmailParsesRow>(`
      SELECT *
      FROM email_parses
      ORDER BY parsed_at DESC;
    `);

    return result.rows.map(
      (emailParse) => new EmailParsesResponseDto(emailParse),
    );
  }

  async findPaginated(
    page = 1,
    limit = 10,
  ): Promise<{
    data: EmailParsesResponseDto[];
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

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<EmailParsesRow>(
        `
        SELECT *
        FROM email_parses
        ORDER BY parsed_at DESC
        LIMIT $1 OFFSET $2;
        `,
        [safeLimit, offset],
      ),
      this.pool.query<{ total: string }>(`
        SELECT COUNT(*) AS total
        FROM email_parses;
      `),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: dataResult.rows.map(
        (emailParse) => new EmailParsesResponseDto(emailParse),
      ),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<EmailParsesResponseDto> {
    const emailParse = await this.findRowById(id);

    return new EmailParsesResponseDto(emailParse);
  }

  async findByScanId(scanId: string): Promise<EmailParsesResponseDto> {
    this.validateScanRequestId(scanId);

    const result = await this.pool.query<EmailParsesRow>(
      `
      SELECT *
      FROM email_parses
      WHERE scan_id = $1;
      `,
      [scanId],
    );

    const emailParse = result.rows[0];

    if (!emailParse) {
      throw new NotFoundException('Email parse not found');
    }

    return new EmailParsesResponseDto(emailParse);
  }

  async search(keyword: string): Promise<EmailParsesResponseDto[]> {
    const q = keyword?.trim();

    if (!q) {
      return this.findAll();
    }

    const result = await this.pool.query<EmailParsesRow>(
      `
      SELECT *
      FROM email_parses
      WHERE
        id ILIKE $1
        OR scan_id ILIKE $1
        OR subject ILIKE $1
        OR from_email ILIKE $1
        OR from_domain ILIKE $1
        OR to_email ILIKE $1
        OR reply_to ILIKE $1
        OR spf_status ILIKE $1
        OR dkim_status ILIKE $1
        OR dmarc_status ILIKE $1
        OR return_path ILIKE $1
        OR message_id ILIKE $1
        OR mailer ILIKE $1
      ORDER BY parsed_at DESC;
      `,
      [`%${q}%`],
    );

    return result.rows.map(
      (emailParse) => new EmailParsesResponseDto(emailParse),
    );
  }

  async create(dto: CreateEmailParsesDto): Promise<EmailParsesResponseDto> {
    this.validateScanRequestId(dto.scan_id);

    try {
      const result = await this.pool.query<EmailParsesRow>(
        `
        INSERT INTO email_parses (
          scan_id,
          subject,
          from_email,
          from_domain,
          to_email,
          reply_to,
          body_text,
          body_html,
          spf_status,
          dkim_status,
          dmarc_status,
          return_path,
          message_id,
          mailer,
          raw_headers
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15
        )
        RETURNING *;
        `,
        [
          dto.scan_id,
          dto.subject ?? null,
          dto.from_email ?? null,
          dto.from_domain ?? null,
          dto.to_email ?? null,
          dto.reply_to ?? null,
          dto.body_text ?? null,
          dto.body_html ?? null,
          dto.spf_status ?? null,
          dto.dkim_status ?? null,
          dto.dmarc_status ?? null,
          dto.return_path ?? null,
          dto.message_id ?? null,
          dto.mailer ?? null,
          dto.raw_headers ?? null,
        ],
      );

      return new EmailParsesResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateEmailParsesDto,
  ): Promise<EmailParsesResponseDto> {
    const current = await this.findRowById(id);

    if (dto.scan_id) {
      this.validateScanRequestId(dto.scan_id);
    }

    try {
      const result = await this.pool.query<EmailParsesRow>(
        `
        UPDATE email_parses
        SET
          scan_id = $1,
          subject = $2,
          from_email = $3,
          from_domain = $4,
          to_email = $5,
          reply_to = $6,
          body_text = $7,
          body_html = $8,
          spf_status = $9,
          dkim_status = $10,
          dmarc_status = $11,
          return_path = $12,
          message_id = $13,
          mailer = $14,
          raw_headers = $15
        WHERE id = $16
        RETURNING *;
        `,
        [
          dto.scan_id ?? current.scan_id,
          dto.subject ?? current.subject,
          dto.from_email ?? current.from_email,
          dto.from_domain ?? current.from_domain,
          dto.to_email ?? current.to_email,
          dto.reply_to ?? current.reply_to,
          dto.body_text ?? current.body_text,
          dto.body_html ?? current.body_html,
          dto.spf_status ?? current.spf_status,
          dto.dkim_status ?? current.dkim_status,
          dto.dmarc_status ?? current.dmarc_status,
          dto.return_path ?? current.return_path,
          dto.message_id ?? current.message_id,
          dto.mailer ?? current.mailer,
          dto.raw_headers ?? current.raw_headers,
          id,
        ],
      );

      return new EmailParsesResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    this.validateEmailParseId(id);

    const result = await this.pool.query<EmailParsesRow>(
      `
      DELETE FROM email_parses
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Email parse not found');
    }

    return {
      message: 'Email parse deleted successfully',
    };
  }

  private async findRowById(id: string): Promise<EmailParsesRow> {
    this.validateEmailParseId(id);

    const result = await this.pool.query<EmailParsesRow>(
      `
      SELECT *
      FROM email_parses
      WHERE id = $1;
      `,
      [id],
    );

    const emailParse = result.rows[0];

    if (!emailParse) {
      throw new NotFoundException('Email parse not found');
    }

    return emailParse;
  }

  private validateEmailParseId(id: string): void {
    const isValid = /^eml-[0-9a-f-]{36}$/.test(id);

    if (!isValid) {
      throw new BadRequestException('Invalid email parse id format');
    }
  }

  private validateScanRequestId(id: string): void {
    const isValid = /^scn-[0-9a-f-]{36}$/.test(id);

    if (!isValid) {
      throw new BadRequestException('Invalid scan request id format');
    }
  }

  private handleWriteError(error: unknown): never {
    if (this.isUniqueViolation(error)) {
      throw new ConflictException('Email parse already exists for this scan');
    }

    if (this.isForeignKeyViolation(error)) {
      throw new NotFoundException('Scan request not found');
    }

    throw error;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
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
