import { ApiProperty } from '@nestjs/swagger';
import {
  PublicPagesRow,
  PublicPageStatus,
} from '../interfaces/public_pages.interface';

export class PublicPagesResponseDto implements PublicPagesRow {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'home' })
  slug!: string;

  @ApiProperty({ example: 'Homepage' })
  name!: string;

  @ApiProperty({ enum: PublicPageStatus, example: PublicPageStatus.DRAFT })
  status!: PublicPageStatus;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;

  constructor(row: PublicPagesRow) {
    Object.assign(this, row);
  }
}
