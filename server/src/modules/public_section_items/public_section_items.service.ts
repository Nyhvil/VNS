import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreatePublicSectionItemsDto } from './dto/create_public_section_items.dto';
import { PublicSectionItemsResponseDto } from './dto/public_section_items_response.dto';
import { UpdatePublicSectionItemsDto } from './dto/update_public_section_items.dto';
import { PublicSectionItemsRow } from './interfaces/public_section_items.interface';

@Injectable()
export class PublicSectionItemsService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async findAll(): Promise<PublicSectionItemsResponseDto[]> {
    const result = await this.pool.query<PublicSectionItemsRow>(`
      SELECT *
      FROM public_section_items
      ORDER BY created_at DESC;
    `);

    return result.rows.map((row) => new PublicSectionItemsResponseDto(row));
  }

  async findPaginated(
    page = 1,
    limit = 10,
  ): Promise<{
    data: PublicSectionItemsResponseDto[];
    meta: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const safePage = Math.max(Number(page), 1);
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<PublicSectionItemsRow>(
        `
        SELECT *
        FROM public_section_items
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
        `,
        [safeLimit, offset],
      ),
      this.pool.query<{ total: string }>(`
        SELECT COUNT(*) AS total
        FROM public_section_items;
      `),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: dataResult.rows.map(
        (row) => new PublicSectionItemsResponseDto(row),
      ),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<PublicSectionItemsResponseDto> {
    this.validateUuid(id, 'public section item');

    const result = await this.pool.query<PublicSectionItemsRow>(
      `
      SELECT *
      FROM public_section_items
      WHERE id = $1;
      `,
      [id],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Public section item not found');
    }

    return new PublicSectionItemsResponseDto(row);
  }

  async findBySectionId(
    sectionId: string,
  ): Promise<PublicSectionItemsResponseDto[]> {
    this.validateUuid(sectionId, 'public section');

    const result = await this.pool.query<PublicSectionItemsRow>(
      `
      SELECT *
      FROM public_section_items
      WHERE section_id = $1
      ORDER BY order_index ASC, created_at DESC;
      `,
      [sectionId],
    );

    return result.rows.map((row) => new PublicSectionItemsResponseDto(row));
  }

  async search(keyword: string): Promise<PublicSectionItemsResponseDto[]> {
    const q = keyword?.trim();
    if (!q) {
      return this.findAll();
    }

    const result = await this.pool.query<PublicSectionItemsRow>(
      `
      SELECT *
      FROM public_section_items
      WHERE
        id::TEXT ILIKE $1
        OR section_id::TEXT ILIKE $1
        OR title ILIKE $1
        OR description ILIKE $1
        OR icon ILIKE $1
        OR image_url ILIKE $1
        OR link_url ILIKE $1
      ORDER BY created_at DESC;
      `,
      [`%${q}%`],
    );

    return result.rows.map((row) => new PublicSectionItemsResponseDto(row));
  }

  async create(
    dto: CreatePublicSectionItemsDto,
  ): Promise<PublicSectionItemsResponseDto> {
    this.validateUuid(dto.section_id, 'public section');

    try {
      const result = await this.pool.query<PublicSectionItemsRow>(
        `
        INSERT INTO public_section_items (
          section_id,
          title,
          description,
          icon,
          image_url,
          link_url,
          meta,
          order_index,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::jsonb, '{}'::jsonb), COALESCE($8, 0), COALESCE($9, TRUE))
        RETURNING *;
        `,
        [
          dto.section_id,
          dto.title ?? null,
          dto.description ?? null,
          dto.icon ?? null,
          dto.image_url ?? null,
          dto.link_url ?? null,
          dto.meta ?? null,
          dto.order_index ?? null,
          dto.is_active ?? null,
        ],
      );

      return new PublicSectionItemsResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(
    id: string,
    dto: UpdatePublicSectionItemsDto,
  ): Promise<PublicSectionItemsResponseDto> {
    this.validateUuid(id, 'public section item');
    const current = await this.findOne(id);

    if (dto.section_id) {
      this.validateUuid(dto.section_id, 'public section');
    }

    try {
      const result = await this.pool.query<PublicSectionItemsRow>(
        `
        UPDATE public_section_items
        SET
          section_id = $1,
          title = $2,
          description = $3,
          icon = $4,
          image_url = $5,
          link_url = $6,
          meta = $7::jsonb,
          order_index = $8,
          is_active = $9,
          updated_at = NOW()
        WHERE id = $10
        RETURNING *;
        `,
        [
          dto.section_id ?? current.section_id,
          dto.title ?? current.title,
          dto.description ?? current.description,
          dto.icon ?? current.icon,
          dto.image_url ?? current.image_url,
          dto.link_url ?? current.link_url,
          dto.meta ?? current.meta,
          dto.order_index ?? current.order_index,
          dto.is_active ?? current.is_active,
          id,
        ],
      );

      return new PublicSectionItemsResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    this.validateUuid(id, 'public section item');

    const result = await this.pool.query<PublicSectionItemsRow>(
      `
      DELETE FROM public_section_items
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('Public section item not found');
    }

    return { message: 'Public section item deleted successfully' };
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
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23503'
    ) {
      throw new NotFoundException('Public section not found');
    }
    throw error;
  }
}
