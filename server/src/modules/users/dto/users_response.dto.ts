import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UsersRow } from '../interfaces/users.interface';

export class UsersResponseDto {
  @ApiProperty({ example: 'usr-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'user@mailguard.com' })
  email!: string;

  @ApiProperty({ example: 'Nguyen Van A', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true })
  avatar_url!: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role!: UserRole;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  updated_at!: Date;

  constructor(user: UsersRow) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.avatar_url = user.avatar_url;
    this.role = user.role;
    this.is_active = user.is_active;
    this.created_at = user.created_at;
    this.updated_at = user.updated_at;
  }
}
