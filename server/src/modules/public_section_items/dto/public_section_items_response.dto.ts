import { ApiProperty } from '@nestjs/swagger';
import { PublicSectionItemsRow } from '../interfaces/public_section_items.interface';

export class PublicSectionItemsResponseDto implements PublicSectionItemsRow {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  section_id!: string;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  icon!: string | null;

  @ApiProperty({ nullable: true })
  image_url!: string | null;

  @ApiProperty({ nullable: true })
  link_url!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true })
  meta!: Record<string, unknown>;

  @ApiProperty({ example: 0 })
  order_index!: number;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;

  constructor(row: PublicSectionItemsRow) {
    Object.assign(this, row);
  }
}
