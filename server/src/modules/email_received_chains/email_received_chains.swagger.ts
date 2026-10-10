import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { EmailReceivedChainsResponseDto } from './dto/email_received_chains_response.dto';

export const EMAIL_RECEIVED_CHAIN_ID_EXAMPLE =
  'rch-550e8400-e29b-41d4-a716-446655440000';
export const EMAIL_PARSE_ID_EXAMPLE =
  'eml-550e8400-e29b-41d4-a716-446655440000';

export function ApiEmailReceivedChainsPaginatedResponse() {
  return applyDecorators(
    ApiExtraModels(EmailReceivedChainsResponseDto),
    ApiOkResponse({
      description: 'Paginated email received chains',
      schema: {
        example: {
          data: [
            {
              id: EMAIL_RECEIVED_CHAIN_ID_EXAMPLE,
              email_parse_id: EMAIL_PARSE_ID_EXAMPLE,
              chain_order: 1,
              ip_address: '192.0.2.10',
              mail_server: 'mail.example.com',
              received_from: 'sender.example.com',
              received_by: 'mx.mailguard.com',
              received_at: '2026-04-24T08:00:00.000Z',
              raw_line:
                'Received: from sender.example.com by mx.mailguard.com;',
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
            items: { $ref: getSchemaPath(EmailReceivedChainsResponseDto) },
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

export function ApiEmailReceivedChainDeletedResponse() {
  return ApiOkResponse({
    description: 'Email received chain deleted successfully',
    schema: {
      example: { message: 'Email received chain deleted successfully' },
    },
  });
}

export function ApiEmailReceivedChainBadRequestResponse() {
  return ApiBadRequestResponse({
    description: 'Invalid email received chain or email parse id format',
    schema: {
      example: {
        message: 'Invalid email received chain id format',
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  });
}

export function ApiEmailReceivedChainNotFoundResponse() {
  return ApiNotFoundResponse({
    description: 'Email received chain or email parse not found',
    schema: {
      example: {
        message: 'Email received chain not found',
        error: 'Not Found',
        statusCode: 404,
      },
    },
  });
}
