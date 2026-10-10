import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreateEmailReceivedChainsDto } from './dto/create_email_received_chains.dto';
import { EmailReceivedChainsResponseDto } from './dto/email_received_chains_response.dto';
import { UpdateEmailReceivedChainsDto } from './dto/update_email_received_chains.dto';
import { EmailReceivedChainsRow } from './interfaces/email_received_chains.interface';

@Injectable()
export class EmailReceivedChainsService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async findAll(): Promise<EmailReceivedChainsResponseDto[]> {
    const result = await this.pool.query<EmailReceivedChainsRow>(`
      SELECT *
      FROM email_received_chains
      ORDER BY email_parse_id ASC, chain_order ASC;
    `);

    return result.rows.map(
      (chain) => new EmailReceivedChainsResponseDto(chain),
    );
  }

  async findPaginated(
    page = 1,
    limit = 10,
  ): Promise<{
    data: EmailReceivedChainsResponseDto[];
    meta: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const safePage = Math.max(Number(page), 1);
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<EmailReceivedChainsRow>(
        `
        SELECT *
        FROM email_received_chains
        ORDER BY email_parse_id ASC, chain_order ASC
        LIMIT $1 OFFSET $2;
        `,
        [safeLimit, offset],
      ),
      this.pool.query<{ total: string }>(`
        SELECT COUNT(*) AS total
        FROM email_received_chains;
      `),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: dataResult.rows.map(
        (chain) => new EmailReceivedChainsResponseDto(chain),
      ),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<EmailReceivedChainsResponseDto> {
    const chain = await this.findRowById(id);
    return new EmailReceivedChainsResponseDto(chain);
  }

  async findByEmailParseId(
    emailParseId: string,
  ): Promise<EmailReceivedChainsResponseDto[]> {
    this.validateEmailParseId(emailParseId);

    const result = await this.pool.query<EmailReceivedChainsRow>(
      `
      SELECT *
      FROM email_received_chains
      WHERE email_parse_id = $1
      ORDER BY chain_order ASC;
      `,
      [emailParseId],
    );

    return result.rows.map(
      (chain) => new EmailReceivedChainsResponseDto(chain),
    );
  }

  async search(keyword: string): Promise<EmailReceivedChainsResponseDto[]> {
    const q = keyword?.trim();

    if (!q) {
      return this.findAll();
    }

    const result = await this.pool.query<EmailReceivedChainsRow>(
      `
      SELECT *
      FROM email_received_chains
      WHERE
        id ILIKE $1
        OR email_parse_id ILIKE $1
        OR ip_address ILIKE $1
        OR mail_server ILIKE $1
        OR received_from ILIKE $1
        OR received_by ILIKE $1
        OR raw_line ILIKE $1
      ORDER BY email_parse_id ASC, chain_order ASC;
      `,
      [`%${q}%`],
    );

    return result.rows.map(
      (chain) => new EmailReceivedChainsResponseDto(chain),
    );
  }

  async create(
    dto: CreateEmailReceivedChainsDto,
  ): Promise<EmailReceivedChainsResponseDto> {
    this.validateEmailParseId(dto.email_parse_id);

    try {
      const result = await this.pool.query<EmailReceivedChainsRow>(
        `
        INSERT INTO email_received_chains (
          email_parse_id,
          chain_order,
          ip_address,
          mail_server,
          received_from,
          received_by,
          received_at,
          raw_line
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
        `,
        [
          dto.email_parse_id,
          dto.chain_order,
          dto.ip_address ?? null,
          dto.mail_server ?? null,
          dto.received_from ?? null,
          dto.received_by ?? null,
          dto.received_at ?? null,
          dto.raw_line ?? null,
        ],
      );

      return new EmailReceivedChainsResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateEmailReceivedChainsDto,
  ): Promise<EmailReceivedChainsResponseDto> {
    const current = await this.findRowById(id);

    if (dto.email_parse_id) {
      this.validateEmailParseId(dto.email_parse_id);
    }

    try {
      const result = await this.pool.query<EmailReceivedChainsRow>(
        `
        UPDATE email_received_chains
        SET
          email_parse_id = $1,
          chain_order = $2,
          ip_address = $3,
          mail_server = $4,
          received_from = $5,
          received_by = $6,
          received_at = $7,
          raw_line = $8
        WHERE id = $9
        RETURNING *;
        `,
        [
          dto.email_parse_id ?? current.email_parse_id,
          dto.chain_order ?? current.chain_order,
          dto.ip_address ?? current.ip_address,
          dto.mail_server ?? current.mail_server,
          dto.received_from ?? current.received_from,
          dto.received_by ?? current.received_by,
          dto.received_at ?? current.received_at,
          dto.raw_line ?? current.raw_line,
          id,
        ],
      );

      return new EmailReceivedChainsResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    this.validateReceivedChainId(id);

    const result = await this.pool.query<EmailReceivedChainsRow>(
      `
      DELETE FROM email_received_chains
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Email received chain not found');
    }

    return { message: 'Email received chain deleted successfully' };
  }

  private async findRowById(id: string): Promise<EmailReceivedChainsRow> {
    this.validateReceivedChainId(id);

    const result = await this.pool.query<EmailReceivedChainsRow>(
      `
      SELECT *
      FROM email_received_chains
      WHERE id = $1;
      `,
      [id],
    );

    const chain = result.rows[0];

    if (!chain) {
      throw new NotFoundException('Email received chain not found');
    }

    return chain;
  }

  private validateReceivedChainId(id: string): void {
    if (!/^rch-[0-9a-f-]{36}$/.test(id)) {
      throw new BadRequestException('Invalid email received chain id format');
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
