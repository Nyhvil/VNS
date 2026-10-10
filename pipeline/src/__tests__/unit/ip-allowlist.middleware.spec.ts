import { Request, Response, NextFunction } from 'express';
import { ipAllowlistMiddleware } from '../../http/middleware/ip-allowlist.middleware';

const mockGetConfig = jest.fn();
const mockGetAllowedIpList = jest.fn();

jest.mock('../../config/config', () => ({
  getConfig: () => mockGetConfig(),
  getAllowedIpList: (config: any) => mockGetAllowedIpList(config),
}));

function mockReq(ip: string, headers: Record<string, string> = {}): Partial<Request> {
  return {
    ip,
    headers,
    socket: { remoteAddress: ip } as any,
  } as Partial<Request>;
}

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('ipAllowlistMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
    mockGetConfig.mockReturnValue({});
    mockGetAllowedIpList.mockReturnValue(['127.0.0.1', '::1']);
  });

  it('should call next() when IP is in allowlist', () => {
    const req = mockReq('127.0.0.1');
    const res = mockRes();

    ipAllowlistMiddleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 when IP is not in allowlist', () => {
    const req = mockReq('192.168.99.99');
    const res = mockRes();

    ipAllowlistMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow all IPs when allowlist is empty', () => {
    mockGetAllowedIpList.mockReturnValue([]);
    const req = mockReq('10.0.0.1');
    const res = mockRes();

    ipAllowlistMiddleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should use X-Forwarded-For header when present', () => {
    const req = mockReq('10.0.0.1', { 'x-forwarded-for': '127.0.0.1' });
    const res = mockRes();

    ipAllowlistMiddleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('should use first IP from X-Forwarded-For chain', () => {
    const req = mockReq('10.0.0.1', { 'x-forwarded-for': '127.0.0.1, 10.0.0.2' });
    const res = mockRes();

    ipAllowlistMiddleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
  });
});
