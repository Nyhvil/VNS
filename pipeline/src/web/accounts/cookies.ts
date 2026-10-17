import { Request, Response } from 'express';

export const SESSION_COOKIE = 'vns_session';
export const GUEST_COOKIE = 'vns_guest';

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const raw = part.slice(index + 1).trim();
    if (!name || name in cookies) continue;
    try {
      cookies[name] = decodeURIComponent(raw);
    } catch {
      cookies[name] = raw;
    }
  }
  return cookies;
}

export function readCookie(req: Request, name: string): string | undefined {
  return parseCookies(req.headers.cookie)[name];
}

/**
 * Was the request made over HTTPS? Behind a proxy that terminates TLS (as on
 * Render) the connection itself is plain HTTP, so the proxy's header decides,
 * but only when proxies are trusted.
 */
export function isSecureRequest(req: Request, trustedProxyHops: number): boolean {
  if ((req.socket as { encrypted?: boolean } | undefined)?.encrypted) return true;
  if (trustedProxyHops <= 0) return false;
  const proto = req.headers['x-forwarded-proto'];
  const value = (Array.isArray(proto) ? proto[0] : proto) ?? '';
  return value.split(',')[0]?.trim().toLowerCase() === 'https';
}

export interface CookieOptions {
  maxAgeSeconds: number;
  secure: boolean;
}

export function setCookie(res: Response, name: string, value: string, options: CookieOptions): void {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (options.secure) parts.push('Secure');

  const existing = res.getHeader('Set-Cookie');
  const list = Array.isArray(existing) ? existing.map(String) : existing ? [String(existing)] : [];
  res.setHeader('Set-Cookie', [...list, parts.join('; ')]);
}

export function clearCookie(res: Response, name: string, secure: boolean): void {
  setCookie(res, name, '', { maxAgeSeconds: 0, secure });
}
