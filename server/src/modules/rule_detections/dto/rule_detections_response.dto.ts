import { ApiProperty } from '@nestjs/swagger';
import {
  RuleDetectionsRow,
  SeverityType,
} from '../interfaces/rule_detections.interface';

export class RuleDetectionsResponseDto implements Omit<
  RuleDetectionsRow,
  'score'
> {
  @ApiProperty({ example: 'rul-550e8400-e29b-41d4-a716-446655440000' })
  id!: string;
  scan_id!: string;
  rule_code!: string;
  rule_name!: string;
  severity!: SeverityType;
  score!: number;
  is_triggered!: boolean;
  evidence!: unknown;
  created_at!: Date;

  constructor(row: RuleDetectionsRow) {
    Object.assign(this, row);
    this.score = Number(row.score ?? 0);
  }
}
