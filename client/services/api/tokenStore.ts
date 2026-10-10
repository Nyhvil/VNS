export const TOKEN_STORAGE_KEY = 'mg_access_token';
export const TOKEN_COOKIE_KEY = TOKEN_STORAGE_KEY;

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    window.localStorage.getItem(TOKEN_STORAGE_KEY) ??
    readTokenFromCookie(document.cookie)
  );
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  document.cookie = `${TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  document.cookie = `${TOKEN_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readTokenFromCookie(cookieValue: string): string | null {
  const cookies = cookieValue.split(';');

  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split('=');

    if (rawName !== TOKEN_COOKIE_KEY) {
      continue;
    }

    return decodeURIComponent(rawValueParts.join('='));
  }

  return null;
}
