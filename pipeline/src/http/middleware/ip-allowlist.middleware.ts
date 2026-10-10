import { Request, Response, NextFunction } from 'express';
import { getConfig, getAllowedIpList } from '../../config/config';

function extractClientIp(req: Request): string {
  // Check X-Forwarded-For header (set by proxies)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const firstIp = ips.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  // Fall back to req.ip or socket remote address
  return req.ip ?? req.socket.remoteAddress ?? '';
}

export function ipAllowlistMiddleware(req: Request, res: Response, next: NextFunction): void {
  let allowedIps: string[];
  try {
    allowedIps = getAllowedIpList(getConfig());
  } catch {
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  // If allowlist is empty, allow all (open mode)
  if (allowedIps.length === 0) {
    next();
    return;
  }

  const clientIp = extractClientIp(req);

  if (allowedIps.includes(clientIp)) {
    next();
    return;
  }

  res.status(403).json({ error: 'Forbidden' });
}
