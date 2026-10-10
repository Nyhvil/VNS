import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { EmailAttachmentsResponseDto } from './dto/email_attachments_response.dto';

export const EMAIL_ATTACHMENT_ID_EXAMPLE =
  'att-550e8400-e29b-41d4-a716-446655440000';
export const EMAIL_PARSE_ID_EXAMPLE =
  'eml-550e8400-e29b-41d4-a716-446655440000';

export function ApiEmailAttachmentsPaginatedResponse() {
  return applyDecorators(
    ApiExtraModels(EmailAttachmentsResponseDto),
    ApiOkResponse({
      description: 'Paginated email attachments',
      schema: {
        example: {
          data: [
            {
              id: EMAIL_ATTACHMENT_ID_EXAMPLE,
              email_parse_id: EMAIL_PARSE_ID_EXAMPLE,
              file_name: 'invoice.pdf',
              mime_type: 'application/pdf',
              file_size: 153600,
              file_url: 'https://files.example.com/invoice.pdf',
              extracted_text: 'Invoice due immediately.',
              has_image: false,
              has_macro: false,
              metadata: { sha256: 'd2d2d2' },
              created_at: '2026-04-24T08:00:00.000Z',
            },
          ],
          meta: {
            page: 1,
            limit: 10,
            total: 1,
            total_pages: 1,
          },
        },
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(EmailAttachmentsResponseDto) },
          },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 10 },
              total: { type: 'number', example: 1 },
              total_pages: { type: 'number', example: 1 },
            },
          },
        },
      },
    }),
  );
}

export function ApiEmailAttachmentDeletedResponse() {
  return ApiOkResponse({
    description: 'Email attachment deleted successfully',
    schema: { example: { message: 'Email attachment deleted successfully' } },
  });
}

export function ApiEmailAttachmentBadRequestResponse() {
  return ApiBadRequestResponse({
    description: 'Invalid email attachment or email parse id format',
    schema: {
      example: {
        message: 'Invalid email attachment id format',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  });
}

export function ApiEmailAttachmentNotFoundResponse() {
  return ApiNotFoundResponse({
    description: 'Email attachment or email parse not found',
    schema: {
      example: {
        message: 'Email attachment not found',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  });
}
