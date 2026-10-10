import { ApiProperty } from '@nestjs/swagger';
import {
  PublicSectionsRow,
  PublicSectionType,
} from '../interfaces/public_sections.interface';

export class PublicSectionsResponseDto implements PublicSectionsRow {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  page_id!: string;

  @ApiProperty({ example: 'hero' })
  key!: string;

  @ApiProperty({ enum: PublicSectionType, example: PublicSectionType.HERO })
  type!: PublicSectionType;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty({ nullable: true })
  subtitle!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  content!: Record<string, unknown>;

  @ApiProperty({ example: 0 })
  order_index!: number;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;

  constructor(row: PublicSectionsRow) {
    Object.assign(this, row);
  }
}
