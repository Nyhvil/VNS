import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../http/middleware/auth.middleware';

jest.mock('../../config/config', () => ({
  getConfig: jest.fn(() => ({ apiKey: 'valid-test-key' })),
}));

function mockReq(headers: Record<string, string> = {}): Partial<Request> {
  return { headers } as Partial<Request>;
}

function mockRes(): { status: jest.Mock; json: jest.Mock } {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('authMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
  });

  it('should call next() when valid API key is provided', () => {
    const req = mockReq({ 'x-api-key': 'valid-test-key' });
    const res = mockRes();

    authMiddleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when API key is missing', () => {
    const req = mockReq({});
    const res = mockRes();

    authMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when API key is wrong', () => {
    const req = mockReq({ 'x-api-key': 'wrong-key' });
    const res = mockRes();

    authMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when API key is empty string', () => {
    const req = mockReq({ 'x-api-key': '' });
    const res = mockRes();

    authMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
