import { ApiProperty } from '@nestjs/swagger';
import { ImageAnalysesRow } from '../interfaces/image_analyses.interface';

export class ImageAnalysesResponseDto implements Omit<
  ImageAnalysesRow,
  'image_score'
> {
  @ApiProperty({ example: 'img-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;
  scan_id!: string;
  ocr_text!: string | null;
  detected_text_blocks!: unknown;
  detected_urls!: unknown;
  has_qr_code!: boolean;
  qr_content!: string | null;
  image_score!: number;
  metadata!: unknown;
  created_at!: Date;

  constructor(row: ImageAnalysesRow) {
    Object.assign(this, row);
    this.image_score = Number(row.image_score ?? 0);
  }
}
