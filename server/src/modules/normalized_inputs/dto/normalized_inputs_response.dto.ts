import { ApiProperty } from '@nestjs/swagger';
import { NormalizedInputsRow } from '../interfaces/normalized_inputs.interface';

export class NormalizedInputsResponseDto implements NormalizedInputsRow {
  @ApiProperty({ example: 'nor-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;
  scan_id!: string;
  normalized_text!: string;
  language!: string | null;
  extracted_urls!: unknown;
  extracted_domains!: unknown;
  extracted_keywords!: unknown;
  ocr_text!: string | null;
  metadata!: unknown;
  created_at!: Date;

  constructor(row: NormalizedInputsRow) {
    Object.assign(this, row);
  }
}
