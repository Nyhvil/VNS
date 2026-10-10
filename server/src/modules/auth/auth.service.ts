import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { AuthProvider } from '../user_auth_accounts/interfaces/user_auth_accounts.interface';
import { UsersResponseDto } from '../users/dto/users_response.dto';
import { UserRole, UsersRow } from '../users/interfaces/users.interface';
import { JwtPayload, UserWithPasswordRow } from './interfaces/auth.interface';
import { AuthResponseDto } from './dto/auth_response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject('PG_POOL') private readonly pool: Pool,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query<{ id: string }>(
        `
        SELECT id
        FROM users
        WHERE email = $1;
        `,
        [dto.email],
      );

      if (existing.rows[0]) {
        throw new ConflictException('Email already exists');
      }

      const userResult = await client.query<UsersRow>(
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
        [
          dto.email,
          dto.name ?? null,
          dto.avatar_url ?? null,
          dto.role ?? UserRole.USER,
        ],
      );

      const passwordHash = await bcrypt.hash(dto.password, 12);

      await client.query(
        `
        INSERT INTO user_auth_accounts (
          user_id,
          provider,
          provider_user_id,
          password_hash
        )
        VALUES (
          $1,
          $2::auth_provider,
          $3,
          $4
        );
        `,
        [userResult.rows[0].id, AuthProvider.LOCAL, dto.email, passwordHash],
      );

      await client.query('COMMIT');

      const user = new UsersResponseDto(userResult.rows[0]);

      return new AuthResponseDto(await this.signToken(user), user);
    } catch (error) {
      await client.query('ROLLBACK');

      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email already exists');
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const result = await this.pool.query<UserWithPasswordRow>(
      `
      SELECT
        users.*,
        user_auth_accounts.password_hash
      FROM users
      INNER JOIN user_auth_accounts
        ON user_auth_accounts.user_id = users.id
      WHERE users.email = $1
        AND user_auth_accounts.provider = $2::auth_provider
        AND user_auth_accounts.provider_user_id = $1;
      `,
      [dto.email, AuthProvider.LOCAL],
    );

    const user = result.rows[0];

    if (!user || !user.password_hash || !user.is_active) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const responseUser = new UsersResponseDto(user);

    return new AuthResponseDto(
      await this.signToken(responseUser),
      responseUser,
    );
  }

  async me(userId: string): Promise<UsersResponseDto> {
    const result = await this.pool.query<UsersRow>(
      `
      SELECT *
      FROM users
      WHERE id = $1;
      `,
      [userId],
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
      throw new UnauthorizedException('User is not available');
    }

    return new UsersResponseDto(user);
  }

  async delete(userId: string): Promise<{ message: string }> {
    this.validateUserId(userId);

    const result = await this.pool.query<UsersRow>(
      `
      DELETE FROM users
      WHERE id = $1
      RETURNING *;
      `,
      [userId],
    );

    if (!result.rows[0]) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User deleted successfully',
    };
  }

  private async signToken(user: UsersResponseDto): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET ?? 'mailguard-dev-secret',
      expiresIn: (process.env.JWT_EXPIRES_IN ??
        '7d') as JwtSignOptions['expiresIn'],
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }

  private validateUserId(id: string): void {
    const isValid = /^usr-[0-9a-f-]{36}$/.test(id);

    if (!isValid) {
      throw new BadRequestException('Invalid user id format');
    }
  }
}
