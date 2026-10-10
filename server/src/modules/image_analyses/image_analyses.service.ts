import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { BasePgCrudService } from '../../common/crud/base_pg_crud.service';
import { ImageAnalysesResponseDto } from './dto/image_analyses_response.dto';
import { ImageAnalysesRow } from './interfaces/image_analyses.interface';

@Injectable()
export class ImageAnalysesService extends BasePgCrudService<
  ImageAnalysesRow,
  ImageAnalysesResponseDto
> {
  constructor(@Inject('PG_POOL') pool: Pool) {
    super(pool, {
      tableName: 'image_analyses',
      idPrefix: 'img',
      entityName: 'Image analysis',
      responseMapper: (row) =>
        new ImageAnalysesResponseDto(row as ImageAnalysesRow),
      requiredFields: ['scan_id'],
      fields: [
        { name: 'scan_id' },
        { name: 'ocr_text' },
        { name: 'detected_text_blocks', type: 'json' },
        { name: 'detected_urls', type: 'json' },
        { name: 'has_qr_code', type: 'boolean' },
        { name: 'qr_content' },
        { name: 'image_score', type: 'numeric' },
        { name: 'metadata', type: 'json' },
      ],
      searchableFields: ['id', 'scan_id', 'ocr_text', 'qr_content'],
    });
  }
}
