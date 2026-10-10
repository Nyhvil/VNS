import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';

export type CrudFieldType = 'boolean' | 'json' | 'numeric' | 'text' | 'vector';

export type CrudFieldConfig = {
  name: string;
  type?: CrudFieldType;
  enumType?: string;
};

export type CrudServiceConfig = {
  tableName: string;
  idPrefix: string;
  entityName: string;
  fields: CrudFieldConfig[];
  requiredFields?: string[];
  searchableFields?: string[];
  responseMapper?: (row: Record<string, unknown>) => unknown;
};

@Injectable()
export abstract class BasePgCrudService<
  TRow extends Record<string, unknown>,
  TResponse = TRow,
> {
  protected constructor(
    @Inject('PG_POOL') protected readonly pool: Pool,
    protected readonly config: CrudServiceConfig,
  ) {}

  async findAll(): Promise<TResponse[]> {
    const result = await this.pool.query<TRow>(`
      SELECT *
      FROM ${this.config.tableName}
      ORDER BY created_at DESC;
    `);

    return this.mapRows(result.rows);
  }

  async findPaginated(
    page = 1,
    limit = 10,
  ): Promise<{
    data: TResponse[];
    meta: { page: number; limit: number; total: number; total_pages: number };
  }> {
    const safePage = Math.max(Number(page), 1);
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<TRow>(
        `
        SELECT *
        FROM ${this.config.tableName}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
        `,
        [safeLimit, offset],
      ),
      this.pool.query<{ total: string }>(`
        SELECT COUNT(*) AS total
        FROM ${this.config.tableName};
      `),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: this.mapRows(dataResult.rows),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<TResponse> {
    return this.findRowById(id);
  }

  async findByScanId(scanId: string): Promise<TResponse[]> {
    this.validateId(scanId, 'scn', 'scan request');

    return this.findByField('scan_id', scanId);
  }

  async findByField(field: string, value: string): Promise<TResponse[]> {
    if (!this.config.fields.some((item) => item.name === field)) {
      throw new BadRequestException(
        `Unsupported ${this.config.entityName} filter`,
      );
    }

    const result = await this.pool.query<TRow>(
      `
      SELECT *
      FROM ${this.config.tableName}
      WHERE ${field} = $1
      ORDER BY created_at DESC;
      `,
      [value],
    );

    return this.mapRows(result.rows);
  }

  async search(keyword: string): Promise<TResponse[]> {
    const q = keyword?.trim();

    if (!q) {
      return this.findAll();
    }

    const searchableFields = this.config.searchableFields ?? ['id'];
    const whereClause = searchableFields
      .map((field) => `${field}::TEXT ILIKE $1`)
      .join(' OR ');

    const result = await this.pool.query<TRow>(
      `
      SELECT *
      FROM ${this.config.tableName}
      WHERE ${whereClause}
      ORDER BY created_at DESC;
      `,
      [`%${q}%`],
    );

    return this.mapRows(result.rows);
  }

  async create(dto: object): Promise<TResponse> {
    const payload = dto as Record<string, unknown>;

    this.validateRequiredFields(payload);
    this.validateForeignIds(payload);

    const fields = this.config.fields.filter((field) =>
      Object.prototype.hasOwnProperty.call(payload, field.name),
    );

    if (!fields.length) {
      throw new BadRequestException(
        `No ${this.config.entityName} data provided`,
      );
    }

    try {
      const columns = fields.map((field) => field.name).join(', ');
      const placeholders = fields
        .map((field, index) => this.placeholderFor(field, index + 1))
        .join(', ');
      const values = fields.map((field) =>
        this.valueFor(field, payload[field.name] ?? null),
      );

      const result = await this.pool.query<TRow>(
        `
        INSERT INTO ${this.config.tableName} (${columns})
        VALUES (${placeholders})
        RETURNING *;
        `,
        values,
      );

      return this.mapRow(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(id: string, dto: object): Promise<TResponse> {
    const payload = dto as Record<string, unknown>;

    this.validateEntityId(id);
    this.validateForeignIds(payload);

    const fields = this.config.fields.filter((field) =>
      Object.prototype.hasOwnProperty.call(payload, field.name),
    );

    if (!fields.length) {
      return this.findRowById(id);
    }

    try {
      const assignments = fields
        .map(
          (field, index) =>
            `${field.name} = ${this.placeholderFor(field, index + 1)}`,
        )
        .join(', ');
      const values = fields.map((field) =>
        this.valueFor(field, payload[field.name] ?? null),
      );

      const result = await this.pool.query<TRow>(
        `
        UPDATE ${this.config.tableName}
        SET ${assignments}
        WHERE id = $${fields.length + 1}
        RETURNING *;
        `,
        [...values, id],
      );

      const row = result.rows[0];

      if (!row) {
        throw new NotFoundException(`${this.config.entityName} not found`);
      }

      return this.mapRow(row);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    this.validateEntityId(id);

    const result = await this.pool.query<TRow>(
      `
      DELETE FROM ${this.config.tableName}
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException(`${this.config.entityName} not found`);
    }

    return { message: `${this.config.entityName} deleted successfully` };
  }

  protected async findRowById(id: string): Promise<TResponse> {
    this.validateEntityId(id);

    const result = await this.pool.query<TRow>(
      `
      SELECT *
      FROM ${this.config.tableName}
      WHERE id = $1;
      `,
      [id],
    );

    const row = result.rows[0];

    if (!row) {
      throw new NotFoundException(`${this.config.entityName} not found`);
    }

    return this.mapRow(row);
  }

  protected mapRow(row: TRow): TResponse {
    if (this.config.responseMapper) {
      return this.config.responseMapper(row) as TResponse;
    }

    return row as unknown as TResponse;
  }

  protected mapRows(rows: TRow[]): TResponse[] {
    return rows.map((row) => this.mapRow(row));
  }

  protected validateEntityId(id: string): void {
    this.validateId(id, this.config.idPrefix, this.config.entityName);
  }

  protected validateId(id: string, prefix: string, name: string): void {
    const pattern = new RegExp(`^${prefix}-[0-9a-f-]{36}$`);

    if (!pattern.test(id)) {
      throw new BadRequestException(`Invalid ${name} id format`);
    }
  }

  private validateRequiredFields(dto: Record<string, unknown>): void {
    for (const field of this.config.requiredFields ?? []) {
      if (
        dto[field] === undefined ||
        dto[field] === null ||
        dto[field] === ''
      ) {
        throw new BadRequestException(`${field} is required`);
      }
    }
  }

  private validateForeignIds(dto: Record<string, unknown>): void {
    const scanId = dto.scan_id;
    const datasetId = dto.dataset_id;

    if (typeof scanId === 'string') {
      this.validateId(scanId, 'scn', 'scan request');
    }

    if (typeof datasetId === 'string') {
      this.validateId(datasetId, 'dat', 'RAG dataset');
    }
  }

  private placeholderFor(field: CrudFieldConfig, index: number): string {
    if (field.enumType) {
      return `$${index}::${field.enumType}`;
    }

    if (field.type === 'json') {
      return `$${index}::jsonb`;
    }

    if (field.type === 'vector') {
      return `$${index}::vector`;
    }

    return `$${index}`;
  }

  private valueFor(field: CrudFieldConfig, value: unknown): unknown {
    if (field.type === 'vector' && Array.isArray(value)) {
      return `[${value.join(',')}]`;
    }

    return value;
  }

  private handleWriteError(error: unknown): never {
    if (this.isPgError(error, '23503')) {
      throw new NotFoundException('Referenced record not found');
    }

    if (this.isPgError(error, '23505')) {
      throw new BadRequestException(`${this.config.entityName} already exists`);
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
}
