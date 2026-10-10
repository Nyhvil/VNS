import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreateUsersDto } from './dto/create_users.dto';
import { UpdateUsersDto } from './dto/update_users.dto';
import { UsersResponseDto } from './dto/users_response.dto';
import { UsersRow } from './interfaces/users.interface';

@Injectable()
export class UsersService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async findAll(): Promise<UsersResponseDto[]> {
    const result = await this.pool.query<UsersRow>(`
      SELECT *
      FROM users
      ORDER BY created_at DESC;
    `);

    return result.rows.map((user) => new UsersResponseDto(user));
  }

  async findPaginated(
    page = 1,
    limit = 10,
  ): Promise<{
    data: UsersResponseDto[];
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
      this.pool.query<UsersRow>(
        `
        SELECT *
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
        `,
        [safeLimit, offset],
      ),
      this.pool.query<{ total: string }>(`
        SELECT COUNT(*) AS total
        FROM users;
      `),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: dataResult.rows.map((user) => new UsersResponseDto(user)),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<UsersResponseDto> {
    this.validateUserId(id);

    const result = await this.pool.query<UsersRow>(
      `
      SELECT *
      FROM users
      WHERE id = $1;
      `,
      [id],
    );

    const user = result.rows[0];

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new UsersResponseDto(user);
  }

  async findByEmail(email: string): Promise<UsersResponseDto> {
    const result = await this.pool.query<UsersRow>(
      `
      SELECT *
      FROM users
      WHERE email = $1;
      `,
      [email],
    );

    const user = result.rows[0];

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new UsersResponseDto(user);
  }

  async search(keyword: string): Promise<UsersResponseDto[]> {
    const q = keyword?.trim();

    if (!q) {
      return this.findAll();
    }

    const result = await this.pool.query<UsersRow>(
      `
      SELECT *
      FROM users
      WHERE
        email ILIKE $1
        OR name ILIKE $1
        OR role::TEXT ILIKE $1
      ORDER BY created_at DESC;
      `,
      [`%${q}%`],
    );

    return result.rows.map((user) => new UsersResponseDto(user));
  }

  async create(dto: CreateUsersDto): Promise<UsersResponseDto> {
    try {
      const result = await this.pool.query<UsersRow>(
        `
        INSERT INTO users (
          email,
          name,
          avatar_url,
          role
        )
        VALUES (
          $1,
          $2,
          $3,
          COALESCE($4::user_role, 'user'::user_role)
        )
        RETURNING *;
        `,
        [dto.email, dto.name ?? null, dto.avatar_url ?? null, dto.role ?? null],
      );

      return new UsersResponseDto(result.rows[0]);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateUsersDto): Promise<UsersResponseDto> {
    this.validateUserId(id);

    const current = await this.findOne(id);

    try {
      const result = await this.pool.query<UsersRow>(
        `
        UPDATE users
        SET
          email = $1,
          name = $2,
          avatar_url = $3,
          role = $4::user_role,
          is_active = $5,
          updated_at = NOW()
        WHERE id = $6
        RETURNING *;
        `,
        [
          dto.email ?? current.email,
          dto.name ?? current.name,
          dto.avatar_url ?? current.avatar_url,
          dto.role ?? current.role,
          dto.is_active ?? current.is_active,
          id,
        ],
      );

      return new UsersResponseDto(result.rows[0]);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email already exists');
      }

      throw error;
    }
  }

  async activate(id: string): Promise<UsersResponseDto> {
    return this.updateActiveStatus(id, true);
  }

  async deactivate(id: string): Promise<UsersResponseDto> {
    return this.updateActiveStatus(id, false);
  }

  async remove(id: string): Promise<{ message: string }> {
    this.validateUserId(id);

    const result = await this.pool.query<UsersRow>(
      `
      DELETE FROM users
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User deleted successfully',
    };
  }

  private async updateActiveStatus(
    id: string,
    isActive: boolean,
  ): Promise<UsersResponseDto> {
    this.validateUserId(id);

    const result = await this.pool.query<UsersRow>(
      `
      UPDATE users
      SET
        is_active = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *;
      `,
      [isActive, id],
    );

    const user = result.rows[0];

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new UsersResponseDto(user);
  }

  private validateUserId(id: string): void {
    const isValid = /^usr-[0-9a-f-]{36}$/.test(id);

    if (!isValid) {
      throw new BadRequestException('Invalid user id format');
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
