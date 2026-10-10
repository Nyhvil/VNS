import { apiRequest } from './apiClient';
import { clearToken, setToken } from './tokenStore';
import type { AuthResponseDto, AuthUserDto } from './types';

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  name?: string;
};

export type AuthServiceResult =
  | { ok: true; user: AuthUser; redirectTo: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Partial<Record<'email' | 'password' | 'name', string>>;
    };

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Vui lòng nhập email.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return 'Email chưa đúng định dạng.';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Vui lòng nhập mật khẩu.';
  if (password.length < 6) return 'Mật khẩu cần ít nhất 6 ký tự.';
  return null;
}

export async function login(payload: LoginPayload): Promise<AuthServiceResult> {
  const emailError = validateEmail(payload.email);
  const passwordError = validatePassword(payload.password);

  if (emailError || passwordError) {
    return {
      ok: false,
      message: 'Thông tin đăng nhập chưa hợp lệ.',
      fieldErrors: {
        ...(emailError ? { email: emailError } : {}),
        ...(passwordError ? { password: passwordError } : {}),
      },
    };
  }

  const result = await apiRequest<AuthResponseDto>('/auth/login', {
    method: 'POST',
    body: { email: payload.email, password: payload.password },
    skipAuth: true,
  });

  if (!result.ok) {
    if (result.error.type === 'unauthorized') {
      return {
        ok: false,
        message: 'Email hoặc mật khẩu không đúng.',
        fieldErrors: { email: 'Email hoặc mật khẩu không đúng.' },
      };
    }

    return { ok: false, message: result.error.message };
  }

  setToken(result.data.access_token);

  return {
    ok: true,
    user: mapAuthUser(result.data.user),
    redirectTo: '/dashboard',
  };
}

export async function register(
  payload: RegisterPayload,
): Promise<AuthServiceResult> {
  const emailError = validateEmail(payload.email);
  const passwordError = validatePassword(payload.password);

  if (emailError || passwordError) {
    return {
      ok: false,
      message: 'Thông tin đăng ký chưa hợp lệ.',
      fieldErrors: {
        ...(emailError ? { email: emailError } : {}),
        ...(passwordError ? { password: passwordError } : {}),
      },
    };
  }

  const result = await apiRequest<AuthResponseDto>('/auth/register', {
    method: 'POST',
    body: {
      email: payload.email,
      password: payload.password,
      name: payload.name,
    },
    skipAuth: true,
  });

  if (!result.ok) {
    if (result.error.status === 409) {
      return {
        ok: false,
        message: 'Email này đã được sử dụng.',
        fieldErrors: { email: 'Email này đã được sử dụng.' },
      };
    }

    return { ok: false, message: result.error.message };
  }

  setToken(result.data.access_token);

  return {
    ok: true,
    user: mapAuthUser(result.data.user),
    redirectTo: '/dashboard',
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const result = await apiRequest<AuthResponseDto['user']>('/auth/me');

  if (!result.ok) {
    return null;
  }

  return mapAuthUser(result.data);
}

export function logout(): void {
  clearToken();
}

function mapAuthUser(user: AuthUserDto): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
