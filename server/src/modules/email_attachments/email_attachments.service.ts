import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreateEmailAttachmentsDto } from './dto/create_email_attachments.dto';
import { EmailAttachmentsResponseDto } from './dto/email_attachments_response.dto';
import { UpdateEmailAttachmentsDto } from './dto/update_email_attachments.dto';
import { EmailAttachmentsRow } from './interfaces/email_attachments.interface';

@Injectable()
export class EmailAttachmentsService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async findAll(): Promise<EmailAttachmentsResponseDto[]> {
    const result = await this.pool.query<EmailAttachmentsRow>(`
      SELECT *
      FROM email_attachments
      ORDER BY created_at DESC;
    `);

    return result.rows.map(
      (attachment) => new EmailAttachmentsResponseDto(attachment),
    );
  }

  async findPaginated(
    page = 1,
    limit = 10,
  ): Promise<{
    data: EmailAttachmentsResponseDto[];
    meta: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const safePage = Math.max(Number(page), 1);
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<EmailAttachmentsRow>(
        `
        SELECT *
        FROM email_attachments
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
        `,
        [safeLimit, offset],
      ),
      this.pool.query<{ total: string }>(`
        SELECT COUNT(*) AS total
        FROM email_attachments;
      `),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: dataResult.rows.map(
        (attachment) => new EmailAttachmentsResponseDto(attachment),
      ),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<EmailAttachmentsResponseDto> {
    const attachment = await this.findRowById(id);
    return new EmailAttachmentsResponseDto(attachment);
  }

  async findByEmailParseId(
    emailParseId: string,
  ): Promise<EmailAttachmentsResponseDto[]> {
    this.validateEmailParseId(emailParseId);

    const result = await this.pool.query<EmailAttachmentsRow>(
      `
      SELECT *
      FROM email_attachments
      WHERE email_parse_id = $1
      ORDER BY created_at DESC;
      `,
      [emailParseId],
    );

    return result.rows.map(
      (attachment) => new EmailAttachmentsResponseDto(attachment),
    );
  }

  async search(keyword: string): Promise<EmailAttachmentsResponseDto[]> {
    const q = keyword?.trim();

    if (!q) {
      return this.findAll();
    }

    const result = await this.pool.query<EmailAttachmentsRow>(
      `
      SELECT *
      FROM email_attachments
      WHERE
        id ILIKE $1
        OR email_parse_id ILIKE $1
        OR file_name ILIKE $1
        OR mime_type ILIKE $1
        OR file_url ILIKE $1
        OR extracted_text ILIKE $1
      ORDER BY created_at DESC;
      `,
      [`%${q}%`],
    );

    return result.rows.map(
      (attachment) => new EmailAttachmentsResponseDto(attachment),
    );
  }

  async create(
    dto: CreateEmailAttachmentsDto,
  ): Promise<EmailAttachmentsResponseDto> {
    this.validateEmailParseId(dto.email_parse_id);

    try {
      const result = await this.pool.query<EmailAttachmentsRow>(
        `
        INSERT INTO email_attachments (
          email_parse_id,
          file_name,
          mime_type,
          file_size,
          file_url,
          extracted_text,
          has_image,
          has_macro,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, FALSE), COALESCE($8, FALSE), $9)
        RETURNING *;
        `,
        [
          dto.email_parse_id,
          dto.file_name ?? null,
          dto.mime_type ?? null,
          dto.file_size ?? null,
          dto.file_url ?? null,
          dto.extracted_text ?? null,
          dto.has_image ?? null,
          dto.has_macro ?? null,
          dto.metadata ?? null,
        ],
      );

      return new EmailAttachmentsResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateEmailAttachmentsDto,
  ): Promise<EmailAttachmentsResponseDto> {
    const current = await this.findRowById(id);

    if (dto.email_parse_id) {
      this.validateEmailParseId(dto.email_parse_id);
    }

    try {
      const result = await this.pool.query<EmailAttachmentsRow>(
        `
        UPDATE email_attachments
        SET
          email_parse_id = $1,
          file_name = $2,
          mime_type = $3,
          file_size = $4,
          file_url = $5,
          extracted_text = $6,
          has_image = $7,
          has_macro = $8,
          metadata = $9
        WHERE id = $10
        RETURNING *;
        `,
        [
          dto.email_parse_id ?? current.email_parse_id,
          dto.file_name ?? current.file_name,
          dto.mime_type ?? current.mime_type,
          dto.file_size ?? current.file_size,
          dto.file_url ?? current.file_url,
          dto.extracted_text ?? current.extracted_text,
          dto.has_image ?? current.has_image,
          dto.has_macro ?? current.has_macro,
          dto.metadata ?? current.metadata,
          id,
        ],
      );

      return new EmailAttachmentsResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    this.validateEmailAttachmentId(id);

    const result = await this.pool.query<EmailAttachmentsRow>(
      `
      DELETE FROM email_attachments
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Email attachment not found');
    }

    return { message: 'Email attachment deleted successfully' };
  }

  private async findRowById(id: string): Promise<EmailAttachmentsRow> {
    this.validateEmailAttachmentId(id);

    const result = await this.pool.query<EmailAttachmentsRow>(
      `
      SELECT *
      FROM email_attachments
      WHERE id = $1;
      `,
      [id],
    );

    const attachment = result.rows[0];

    if (!attachment) {
      throw new NotFoundException('Email attachment not found');
    }

    return attachment;
  }

  private validateEmailAttachmentId(id: string): void {
    if (!/^att-[0-9a-f-]{36}$/.test(id)) {
      throw new BadRequestException('Invalid email attachment id format');
    }
  }

  private validateEmailParseId(id: string): void {
    if (!/^eml-[0-9a-f-]{36}$/.test(id)) {
      throw new BadRequestException('Invalid email parse id format');
    }
  }

  private handleWriteError(error: unknown): never {
    if (this.isForeignKeyViolation(error)) {
      throw new NotFoundException('Email parse not found');
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
