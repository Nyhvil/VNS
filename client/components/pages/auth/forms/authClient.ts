import { login, register, type AuthServiceResult } from '@/services/api/authService';

export type AuthFieldErrorMap = Partial<
  Record<'fullName' | 'email' | 'password', string>
>;

export type AuthClientResult = {
  ok: boolean;
  message: string;
  redirectTo?: string;
  user?: { id: string; name: string; email: string };
  fieldErrors?: AuthFieldErrorMap;
};

function adaptAuthResult(result: AuthServiceResult): AuthClientResult {
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: {
        ...(result.fieldErrors?.email ? { email: result.fieldErrors.email } : {}),
        ...(result.fieldErrors?.password
          ? { password: result.fieldErrors.password }
          : {}),
        ...(result.fieldErrors?.name ? { fullName: result.fieldErrors.name } : {}),
      },
    };
  }

  return {
    ok: true,
    message: 'Đăng nhập thành công.',
    redirectTo: result.redirectTo,
    user: {
      id: result.user.id,
      name: result.user.name ?? result.user.email,
      email: result.user.email,
    },
  };
}

export async function requestAuth(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<AuthClientResult> {
  if (endpoint.endsWith('/login') && payload['provider']) {
    return {
      ok: false,
      message: 'Đăng nhập qua provider chưa được server hỗ trợ.',
    };
  }

  if (endpoint.endsWith('/login')) {
    const result = await login({
      email: String(payload['email'] ?? ''),
      password: String(payload['password'] ?? ''),
    });
    return adaptAuthResult(result);
  }

  if (endpoint.endsWith('/register')) {
    const result = await register({
      email: String(payload['email'] ?? ''),
      password: String(payload['password'] ?? ''),
      name: payload['fullName'] ? String(payload['fullName']) : undefined,
    });
    return adaptAuthResult(result);
  }

  return { ok: false, message: 'Auth action không được hỗ trợ.' };
}

export const requestServerAuth = requestAuth;
