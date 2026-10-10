import { clearToken, getToken } from './tokenStore';
import type { ApiError, ApiResult } from './types';

const BASE_URL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:5000/api';

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  const token = getToken();
  const requestHeaders: Record<string, string> = { ...headers };

  if (!skipAuth && token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return { ok: true, data: undefined as T };
    }

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      const error = buildApiError(response.status, payload, skipAuth);
      logError(path, error, payload);
      return { ok: false, error };
    }

    return { ok: true, data: payload as T };
  } catch (err) {
    const error: ApiError = {
      type: 'network_error',
      message:
        'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
    };
    logError(path, error, err);
    return { ok: false, error };
  }
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text || null;
  } catch {
    return null;
  }
}

function buildApiError(
  status: number,
  payload: unknown,
  skipAuth: boolean,
): ApiError {
  if (status === 401) {
    if (!skipAuth) {
      clearToken();

      if (typeof window !== 'undefined') {
        window.location.href = '/login?reason=session_expired';
      }
    }

    return {
      type: 'unauthorized',
      message: extractErrorMessage(
        payload,
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      ),
      status,
    };
  }

  if (status === 404) {
    return {
      type: 'not_found',
      message: extractErrorMessage(payload, 'Không tìm thấy tài nguyên yêu cầu.'),
      status,
    };
  }

  if (status >= 500) {
    return {
      type: 'server_error',
      message: extractErrorMessage(
        payload,
        'Đã xảy ra lỗi phía server. Vui lòng thử lại sau.',
      ),
      status,
    };
  }

  return {
    type: 'validation_error',
    message: extractErrorMessage(payload, 'Dữ liệu không hợp lệ.'),
    status,
  };
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) {
    return normalizeErrorMessage(payload, fallback);
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(candidate.message)) {
      const firstMessage = candidate.message.find(
        (value) => typeof value === 'string' && value.trim(),
      );

      if (firstMessage) {
        return normalizeErrorMessage(firstMessage, fallback);
      }
    }

    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return normalizeErrorMessage(candidate.message, fallback);
    }

    if (typeof candidate.error === 'string' && candidate.error.trim()) {
      return normalizeErrorMessage(candidate.error, fallback);
    }
  }

  return fallback;
}

function normalizeErrorMessage(message: string, fallback: string): string {
  const trimmed = message.trim();

  if (!trimmed) {
    return fallback;
  }

  if (/^pipeline analysis failed:\s*$/i.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function logError(path: string, error: ApiError, raw?: unknown): void {
  if (process.env['NODE_ENV'] === 'development') {
    const log = error.type === 'network_error' ? console.error : console.warn;
    log(`[API] ${error.type} on ${path}:`, error.message, raw ?? '');
  }
}
