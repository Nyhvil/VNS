import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { EmailLinksResponseDto } from './dto/email_links_response.dto';

export const EMAIL_LINK_ID_EXAMPLE = 'lnk-550e8400-e29b-41d4-a716-446655440000';
export const SCAN_REQUEST_ID_EXAMPLE =
  'scn-550e8400-e29b-41d4-a716-446655440000';
export const EMAIL_PARSE_ID_EXAMPLE =
  'eml-550e8400-e29b-41d4-a716-446655440000';

export function ApiEmailLinksPaginatedResponse() {
  return applyDecorators(
    ApiExtraModels(EmailLinksResponseDto),
    ApiOkResponse({
      description: 'Paginated email links',
      schema: {
        example: {
          data: [
            {
              id: EMAIL_LINK_ID_EXAMPLE,
              scan_id: SCAN_REQUEST_ID_EXAMPLE,
              email_parse_id: EMAIL_PARSE_ID_EXAMPLE,
              original_url: 'https://example.com/login',
              display_text: 'Verify account',
              domain: 'example.com',
              is_shortened: false,
              is_suspicious: true,
              metadata: { redirect_count: 2 },
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
            items: { $ref: getSchemaPath(EmailLinksResponseDto) },
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

export function ApiEmailLinkDeletedResponse() {
  return ApiOkResponse({
    description: 'Email link deleted successfully',
    schema: { example: { message: 'Email link deleted successfully' } },
  });
}

export function ApiEmailLinkBadRequestResponse() {
  return ApiBadRequestResponse({
    description: 'Invalid email link, scan request, or email parse id format',
    schema: {
      example: {
        message: 'Invalid email link id format',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  });
}

export function ApiEmailLinkNotFoundResponse() {
  return ApiNotFoundResponse({
    description: 'Email link, scan request, or email parse not found',
    schema: {
      example: {
        message: 'Email link not found',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  });
}
