import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateRagEmbeddingsDto {
  @ApiProperty({ example: 'dat-550e8400-e29b-41d4-a716-446655440000' })
  @Matches(/^dat-[0-9a-f-]{36}$/)
  dataset_id!: string;

  @ApiProperty({ example: [0.0123, -0.0456, 0.0789] })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  embedding!: number[];

  @ApiProperty({ example: 'text-embedding-3-small' })
  @IsString()
  @MaxLength(100)
  embedding_model!: string;
}
