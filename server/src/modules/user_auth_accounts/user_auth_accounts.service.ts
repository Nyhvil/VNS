import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { CreateUserAuthAccountsDto } from './dto/create_user_auth_accounts.dto';
import { UpdateUserAuthAccountsDto } from './dto/update_user_auth_accounts.dto';
import { UserAuthAccountsResponseDto } from './dto/user_auth_accounts_response.dto';
import {
  AuthProvider,
  UserAuthAccountsRow,
} from './interfaces/user_auth_accounts.interface';

@Injectable()
export class UserAuthAccountsService {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}

  async findAll(): Promise<UserAuthAccountsResponseDto[]> {
    const result = await this.pool.query<UserAuthAccountsRow>(`
      SELECT *
      FROM user_auth_accounts
      ORDER BY created_at DESC;
    `);

    return result.rows.map(
      (account) => new UserAuthAccountsResponseDto(account),
    );
  }

  async findPaginated(
    page = 1,
    limit = 10,
  ): Promise<{
    data: UserAuthAccountsResponseDto[];
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
      this.pool.query<UserAuthAccountsRow>(
        `
        SELECT *
        FROM user_auth_accounts
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2;
        `,
        [safeLimit, offset],
      ),
      this.pool.query<{ total: string }>(`
        SELECT COUNT(*) AS total
        FROM user_auth_accounts;
      `),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return {
      data: dataResult.rows.map(
        (account) => new UserAuthAccountsResponseDto(account),
      ),
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string): Promise<UserAuthAccountsResponseDto> {
    const account = await this.findRowById(id);

    return new UserAuthAccountsResponseDto(account);
  }

  async findByUserId(userId: string): Promise<UserAuthAccountsResponseDto[]> {
    this.validateUserId(userId);

    const result = await this.pool.query<UserAuthAccountsRow>(
      `
      SELECT *
      FROM user_auth_accounts
      WHERE user_id = $1
      ORDER BY created_at DESC;
      `,
      [userId],
    );

    return result.rows.map(
      (account) => new UserAuthAccountsResponseDto(account),
    );
  }

  async findLocalByProviderUserId(
    providerUserId: string,
  ): Promise<UserAuthAccountsRow | null> {
    const result = await this.pool.query<UserAuthAccountsRow>(
      `
      SELECT *
      FROM user_auth_accounts
      WHERE provider = $1::auth_provider
        AND provider_user_id = $2;
      `,
      [AuthProvider.LOCAL, providerUserId],
    );

    return result.rows[0] ?? null;
  }

  async create(
    dto: CreateUserAuthAccountsDto,
  ): Promise<UserAuthAccountsResponseDto> {
    try {
      const result = await this.pool.query<UserAuthAccountsRow>(
        `
        INSERT INTO user_auth_accounts (
          user_id,
          provider,
          provider_user_id,
          password_hash,
          access_token,
          refresh_token
        )
        VALUES (
          $1,
          $2::auth_provider,
          $3,
          $4,
          $5,
          $6
        )
        RETURNING *;
        `,
        [
          dto.user_id,
          dto.provider,
          dto.provider_user_id ?? null,
          dto.password_hash ?? null,
          dto.access_token ?? null,
          dto.refresh_token ?? null,
        ],
      );

      return new UserAuthAccountsResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateUserAuthAccountsDto,
  ): Promise<UserAuthAccountsResponseDto> {
    const current = await this.findRowById(id);

    try {
      const result = await this.pool.query<UserAuthAccountsRow>(
        `
        UPDATE user_auth_accounts
        SET
          user_id = $1,
          provider = $2::auth_provider,
          provider_user_id = $3,
          password_hash = $4,
          access_token = $5,
          refresh_token = $6,
          updated_at = NOW()
        WHERE id = $7
        RETURNING *;
        `,
        [
          dto.user_id ?? current.user_id,
          dto.provider ?? current.provider,
          dto.provider_user_id ?? current.provider_user_id,
          dto.password_hash ?? current.password_hash,
          dto.access_token ?? current.access_token,
          dto.refresh_token ?? current.refresh_token,
          id,
        ],
      );

      return new UserAuthAccountsResponseDto(result.rows[0]);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    this.validateAccountId(id);

    const result = await this.pool.query<UserAuthAccountsRow>(
      `
      DELETE FROM user_auth_accounts
      WHERE id = $1
      RETURNING *;
      `,
      [id],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('User auth account not found');
    }

    return {
      message: 'User auth account deleted successfully',
    };
  }

  private async findRowById(id: string): Promise<UserAuthAccountsRow> {
    this.validateAccountId(id);

    const result = await this.pool.query<UserAuthAccountsRow>(
      `
      SELECT *
      FROM user_auth_accounts
      WHERE id = $1;
      `,
      [id],
    );

    const account = result.rows[0];

    if (!account) {
      throw new NotFoundException('User auth account not found');
    }

    return account;
  }

  private validateAccountId(id: string): void {
    const isValid = /^aut-[0-9a-f-]{36}$/.test(id);

    if (!isValid) {
      throw new BadRequestException('Invalid user auth account id format');
    }
  }

  private validateUserId(id: string): void {
    const isValid = /^usr-[0-9a-f-]{36}$/.test(id);

    if (!isValid) {
      throw new BadRequestException('Invalid user id format');
    }
  }

  private handleWriteError(error: unknown): never {
    if (this.isUniqueViolation(error)) {
      throw new ConflictException('Provider account already exists');
    }

    if (this.isForeignKeyViolation(error)) {
      throw new NotFoundException('User not found');
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
