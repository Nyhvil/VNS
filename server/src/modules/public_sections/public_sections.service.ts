import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreatePublicSectionsDto } from './dto/create_public_sections.dto';
import { PublicSectionsResponseDto } from './dto/public_sections_response.dto';
import { UpdatePublicSectionsDto } from './dto/update_public_sections.dto';
import { PublicSectionsRow } from './interfaces/public_sections.interface';

@Injectable()
export class PublicSectionsService {
  private enumReadyPromise: Promise<void> | null = null;

  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async findAll(): Promise<PublicSectionsResponseDto[]> {
    const result = await this.pool.query<PublicSectionsRow>(`
      SELECT *
      FROM public_sections
      ORDER BY created_at DESC;
    `);

    return result.rows.map((row) => new PublicSectionsResponseDto(row));
  }

  async findPaginated(
    page = 1,
    limit = 10,
  ): Promise<{
    data: PublicSectionsResponseDto[];
    meta: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const safePage = Math.max(Number(page), 1);
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<PublicSectionsRow>(
        `
        SELECT *
        FROM public_sections
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
        `,
        [safeLimit, offset],
      ),
      this.pool.query<{ total: string }>(`
        SELECT COUNT(*) AS total
        FROM public_sections;
      `),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: dataResult.rows.map((row) => new PublicSectionsResponseDto(row)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<PublicSectionsResponseDto> {
    this.validateUuid(id, 'public section');

    const result = await this.pool.query<PublicSectionsRow>(
      `
      SELECT *
      FROM public_sections
      WHERE id = $1;
      `,
      [id],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Public section not found');
    }

    return new PublicSectionsResponseDto(row);
  }

  async findByPageId(pageId: string): Promise<PublicSectionsResponseDto[]> {
    this.validateUuid(pageId, 'public page');

    const result = await this.pool.query<PublicSectionsRow>(
      `
      SELECT *
      FROM public_sections
      WHERE page_id = $1
      ORDER BY order_index ASC, created_at DESC;
      `,
      [pageId],
    );

    return result.rows.map((row) => new PublicSectionsResponseDto(row));
  }

  async search(keyword: string): Promise<PublicSectionsResponseDto[]> {
    const q = keyword?.trim();
    if (!q) {
      return this.findAll();
    }

    const result = await this.pool.query<PublicSectionsRow>(
      `
      SELECT *
      FROM public_sections
      WHERE
        id::TEXT ILIKE $1
        OR page_id::TEXT ILIKE $1
        OR key ILIKE $1
        OR type::TEXT ILIKE $1
        OR title ILIKE $1
        OR subtitle ILIKE $1
      ORDER BY created_at DESC;
      `,
      [`%${q}%`],
    );

    return result.rows.map((row) => new PublicSectionsResponseDto(row));
  }

  async create(
    dto: CreatePublicSectionsDto,
  ): Promise<PublicSectionsResponseDto> {
    this.validateUuid(dto.page_id, 'public page');
    await this.ensurePublicSectionTypeValues();

    try {
      const result = await this.pool.query<PublicSectionsRow>(
        `
        INSERT INTO public_sections (
          page_id,
          key,
          type,
          title,
          subtitle,
          content,
          order_index,
          is_active
        )
        VALUES ($1, $2, $3::public_section_type, $4, $5, COALESCE($6::jsonb, '{}'::jsonb), COALESCE($7, 0), COALESCE($8, TRUE))
        RETURNING *;
        `,
        [
          dto.page_id,
          dto.key,
          dto.type,
          dto.title ?? null,
          dto.subtitle ?? null,
          dto.content ?? null,
          dto.order_index ?? null,
          dto.is_active ?? null,
        ],
      );

      return new PublicSectionsResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(
    id: string,
    dto: UpdatePublicSectionsDto,
  ): Promise<PublicSectionsResponseDto> {
    this.validateUuid(id, 'public section');
    await this.ensurePublicSectionTypeValues();

    const current = await this.findOne(id);
    if (dto.page_id) {
      this.validateUuid(dto.page_id, 'public page');
    }

    try {
      const result = await this.pool.query<PublicSectionsRow>(
        `
        UPDATE public_sections
        SET
          page_id = $1,
          key = $2,
          type = $3::public_section_type,
          title = $4,
          subtitle = $5,
          content = $6::jsonb,
          order_index = $7,
          is_active = $8,
          updated_at = NOW()
        WHERE id = $9
        RETURNING *;
        `,
        [
          dto.page_id ?? current.page_id,
          dto.key ?? current.key,
          dto.type ?? current.type,
          dto.title ?? current.title,
          dto.subtitle ?? current.subtitle,
          dto.content ?? current.content,
          dto.order_index ?? current.order_index,
          dto.is_active ?? current.is_active,
          id,
        ],
      );

      return new PublicSectionsResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    this.validateUuid(id, 'public section');

    const result = await this.pool.query<PublicSectionsRow>(
      `
      DELETE FROM public_sections
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Public section not found');
    }

    return { message: 'Public section deleted successfully' };
  }

  private validateUuid(id: string, name: string): void {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      );
    if (!isUuid) {
      throw new BadRequestException(`Invalid ${name} id format`);
    }
  }

  private handleWriteError(error: unknown): never {
    if (this.isPgError(error, '23503')) {
      throw new NotFoundException('Public page not found');
    }
    if (this.isPgError(error, '23505')) {
      throw new ConflictException(
        'Public section key already exists in this page',
      );
    }
    throw error;
  }

  private isPgError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }

  private async ensurePublicSectionTypeValues(): Promise<void> {
    if (!this.enumReadyPromise) {
      this.enumReadyPromise = (async () => {
        await this.pool.query(`
          DO $$ BEGIN
            ALTER TYPE public_section_type ADD VALUE IF NOT EXISTS 'list';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END $$;
        `);
        await this.pool.query(`
          DO $$ BEGIN
            ALTER TYPE public_section_type ADD VALUE IF NOT EXISTS 'compared';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END $$;
        `);
      })();
    }

    await this.enumReadyPromise;
  }
}
