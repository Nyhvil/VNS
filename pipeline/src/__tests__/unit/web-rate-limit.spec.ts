import express from 'express';
import request from 'supertest';
import { getClientIp, rateLimit, RateLimiter } from '../../web/rate-limit';
import { decodeBase64, detectImageType } from '../../web/image-type';

function fakeRequest(forwardedFor: string | undefined, socketAddress = '10.0.0.1') {
  return {
    headers: forwardedFor === undefined ? {} : { 'x-forwarded-for': forwardedFor },
    socket: { remoteAddress: socketAddress },
  } as any;
}

describe('getClientIp()', () => {
  it('should use the connection address when no proxy is trusted', () => {
    expect(getClientIp(fakeRequest('1.2.3.4'), 0)).toBe('10.0.0.1');
  });

  it('should take the entry written by the trusted proxy', () => {
    expect(getClientIp(fakeRequest('1.2.3.4'), 1)).toBe('1.2.3.4');
    expect(getClientIp(fakeRequest('1.2.3.4, 172.16.0.9'), 2)).toBe('1.2.3.4');
  });

  it('should ignore entries the caller added in front', () => {
    // The caller sent "9.9.9.9"; the single trusted proxy appended the real address.
    expect(getClientIp(fakeRequest('9.9.9.9, 1.2.3.4'), 1)).toBe('1.2.3.4');
  });

  it('should fall back to the connection address when the header is missing', () => {
    expect(getClientIp(fakeRequest(undefined), 2)).toBe('10.0.0.1');
  });

  it('should use the leftmost entry when there are fewer entries than trusted proxies', () => {
    expect(getClientIp(fakeRequest('1.2.3.4'), 3)).toBe('1.2.3.4');
  });
});

describe('RateLimiter', () => {
  it('should allow up to the limit and then say how long to wait', () => {
    let now = 1000;
    const limiter = new RateLimiter(2, 10_000, () => now);

    expect(limiter.hit('a')).toBe(0);
    expect(limiter.hit('a')).toBe(0);
    now = 4000;
    expect(limiter.hit('a')).toBe(7000);
    expect(limiter.hit('b')).toBe(0); // another caller is not affected
  });

  it('should start again when the window is over', () => {
    let now = 0;
    const limiter = new RateLimiter(1, 1000, () => now);
    expect(limiter.hit('a')).toBe(0);
    expect(limiter.hit('a')).toBeGreaterThan(0);
    now = 1000;
    expect(limiter.hit('a')).toBe(0);
  });
});

describe('rateLimit() middleware', () => {
  function buildApp(options: Partial<Parameters<typeof rateLimit>[0]> = {}) {
    const app = express();
    app.get(
      '/',
      rateLimit({ perIp: 2, windowMs: 60_000, trustedProxyHops: 1, message: 'Chậm lại', ...options }),
      (_req, res) => res.json({ ok: true })
    );
    return app;
  }

  it('should answer 429 with Retry-After once an address is over its limit', async () => {
    const app = buildApp();
    await request(app).get('/').set('X-Forwarded-For', '1.1.1.1').expect(200);
    await request(app).get('/').set('X-Forwarded-For', '1.1.1.1').expect(200);

    const blocked = await request(app).get('/').set('X-Forwarded-For', '1.1.1.1');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Chậm lại' });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);

    await request(app).get('/').set('X-Forwarded-For', '2.2.2.2').expect(200);
  });

  it('should cap all callers together with the global limit', async () => {
    const app = buildApp({ perIp: 100, globalPerMinute: 2 });
    await request(app).get('/').set('X-Forwarded-For', '1.1.1.1').expect(200);
    await request(app).get('/').set('X-Forwarded-For', '2.2.2.2').expect(200);
    await request(app).get('/').set('X-Forwarded-For', '3.3.3.3').expect(429);
  });
});

describe('detectImageType()', () => {
  const pad = (bytes: number[]) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);

  it('should recognise the four accepted formats from their first bytes', () => {
    expect(detectImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(detectImageType(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]))).toBe('image/webp');
    expect(detectImageType(Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(16)]))).toBe('image/gif');
  });

  it('should reject anything else', () => {
    expect(detectImageType(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(detectImageType(Buffer.from('%PDF-1.7 ............'))).toBeNull();
    expect(detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});

describe('decodeBase64()', () => {
  it('should decode base64, with or without line breaks', () => {
    expect(decodeBase64('aGVsbG8=')?.toString()).toBe('hello');
    expect(decodeBase64('aGVs\nbG8=')?.toString()).toBe('hello');
  });

  it('should return null for text that is not base64', () => {
    expect(decodeBase64('')).toBeNull();
    expect(decodeBase64('not base64!')).toBeNull();
    expect(decodeBase64('data:image/png;base64,AAAA')).toBeNull();
  });
});
