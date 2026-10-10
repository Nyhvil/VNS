import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreatePublicPagesDto } from './dto/create_public_pages.dto';
import { PublicPagesResponseDto } from './dto/public_pages_response.dto';
import { UpdatePublicPagesDto } from './dto/update_public_pages.dto';
import { PublicPagesRow } from './interfaces/public_pages.interface';

@Injectable()
export class PublicPagesService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async findAll(): Promise<PublicPagesResponseDto[]> {
    const result = await this.pool.query<PublicPagesRow>(`
      SELECT *
      FROM public_pages
      ORDER BY created_at DESC;
    `);

    return result.rows.map((row) => new PublicPagesResponseDto(row));
  }

  async findPaginated(
    page = 1,
    limit = 10,
  ): Promise<{
    data: PublicPagesResponseDto[];
    meta: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const safePage = Math.max(Number(page), 1);
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<PublicPagesRow>(
        `
        SELECT *
        FROM public_pages
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
        `,
        [safeLimit, offset],
      ),
      this.pool.query<{ total: string }>(`
        SELECT COUNT(*) AS total
        FROM public_pages;
      `),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: dataResult.rows.map((row) => new PublicPagesResponseDto(row)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<PublicPagesResponseDto> {
    this.validateId(id);

    const result = await this.pool.query<PublicPagesRow>(
      `
      SELECT *
      FROM public_pages
      WHERE id = $1;
      `,
      [id],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Public page not found');
    }

    return new PublicPagesResponseDto(row);
  }

  async findBySlug(slug: string): Promise<PublicPagesResponseDto> {
    const result = await this.pool.query<PublicPagesRow>(
      `
      SELECT *
      FROM public_pages
      WHERE slug = $1;
      `,
      [slug],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Public page not found');
    }

    return new PublicPagesResponseDto(row);
  }

  async search(keyword: string): Promise<PublicPagesResponseDto[]> {
    const q = keyword?.trim();

    if (!q) {
      return this.findAll();
    }

    const result = await this.pool.query<PublicPagesRow>(
      `
      SELECT *
      FROM public_pages
      WHERE
        id::TEXT ILIKE $1
        OR slug ILIKE $1
        OR name ILIKE $1
        OR status::TEXT ILIKE $1
      ORDER BY created_at DESC;
      `,
      [`%${q}%`],
    );

    return result.rows.map((row) => new PublicPagesResponseDto(row));
  }

  async create(dto: CreatePublicPagesDto): Promise<PublicPagesResponseDto> {
    try {
      const result = await this.pool.query<PublicPagesRow>(
        `
        INSERT INTO public_pages (slug, name, status)
        VALUES ($1, $2, COALESCE($3::public_page_status, 'draft'::public_page_status))
        RETURNING *;
        `,
        [dto.slug, dto.name, dto.status ?? null],
      );

      return new PublicPagesResponseDto(result.rows[0]);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Public page slug already exists');
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdatePublicPagesDto,
  ): Promise<PublicPagesResponseDto> {
    this.validateId(id);

    const current = await this.findOne(id);

    try {
      const result = await this.pool.query<PublicPagesRow>(
        `
        UPDATE public_pages
        SET
          slug = $1,
          name = $2,
          status = $3::public_page_status,
          updated_at = NOW()
        WHERE id = $4
        RETURNING *;
        `,
        [
          dto.slug ?? current.slug,
          dto.name ?? current.name,
          dto.status ?? current.status,
          id,
        ],
      );

      return new PublicPagesResponseDto(result.rows[0]);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Public page slug already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    this.validateId(id);

    const result = await this.pool.query<PublicPagesRow>(
      `
      DELETE FROM public_pages
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Public page not found');
    }

    return { message: 'Public page deleted successfully' };
  }

  private validateId(id: string): void {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      );
    if (!isUuid) {
      throw new BadRequestException('Invalid public page id format');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
