import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Address of the caller.
 *
 * `trustedProxyHops` is the number of proxies between the internet and this
 * server (0 when it is reached directly). Each proxy appends the address it
 * received the request from to X-Forwarded-For, so with N trusted proxies the
 * caller is the N-th entry from the right. Entries further left were written
 * by the caller and cannot be trusted.
 */
export function getClientIp(req: Request, trustedProxyHops: number): string {
  const socketAddress = req.socket?.remoteAddress ?? '';
  if (trustedProxyHops <= 0) return socketAddress;

  const header = req.headers['x-forwarded-for'];
  const value = Array.isArray(header) ? header.join(',') : header ?? '';
  const entries = value
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) return socketAddress;
  const index = Math.max(0, entries.length - trustedProxyHops);
  return entries[index] ?? socketAddress;
}

interface Window {
  count: number;
  resetAt: number;
}

/** Fixed-window counter kept in memory. */
export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now
  ) {}

  /** Count one hit. Returns how long to wait (ms) when over the limit, else 0. */
  hit(key: string): number {
    const now = this.now();
    const current = this.windows.get(key);

    if (!current || current.resetAt <= now) {
      // Drop expired entries now and then so the map cannot grow without bound.
      if (this.windows.size > 5000) this.sweep(now);
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return 0;
    }

    current.count += 1;
    return current.count > this.limit ? current.resetAt - now : 0;
  }

  private sweep(now: number): void {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Requests allowed per address in one window. */
  perIp: number;
  windowMs: number;
  /** Requests allowed from everyone together in one minute; 0 switches it off. */
  globalPerMinute?: number;
  trustedProxyHops: number;
  message: string;
}

/**
 * Express middleware. The per-address limit stops one visitor from flooding
 * the server; the global limit caps what the AI provider is asked for however
 * many addresses the requests come from.
 */
export function rateLimit(options: RateLimitOptions): RequestHandler {
  const perIp = new RateLimiter(options.perIp, options.windowMs);
  const global =
    options.globalPerMinute && options.globalPerMinute > 0
      ? new RateLimiter(options.globalPerMinute, 60_000)
      : null;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIp(req, options.trustedProxyHops) || 'unknown';
    const wait = Math.max(perIp.hit(ip), global ? global.hit('all') : 0);

    if (wait > 0) {
      res.setHeader('Retry-After', String(Math.ceil(wait / 1000)));
      res.status(429).json({ error: options.message });
      return;
    }
    next();
  };
}
