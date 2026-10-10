import type { NextRequest } from 'next/server';

import { authMiddleware } from '@/middlewares/authMiddleware';

export function proxy(request: NextRequest) {
  return authMiddleware(request);
}

export const config = {
  matcher: ['/dashboard/:path*', '/analyze_result/:path*'],
};
