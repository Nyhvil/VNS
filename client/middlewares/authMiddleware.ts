import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { TOKEN_COOKIE_KEY } from '@/services/api/tokenStore';

const PROTECTED_PREFIXES = ['/dashboard', '/analyze_result'];

export function authMiddleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE_KEY)?.value;

  if (token) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirectTo', pathname);

  return NextResponse.redirect(loginUrl);
}
