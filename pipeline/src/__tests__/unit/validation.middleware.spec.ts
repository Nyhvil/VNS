import { Request, Response, NextFunction } from 'express';
import { validateAnalysisRequestMiddleware } from '../../http/middleware/validation.middleware';

function mockReq(body: unknown): Partial<Request> {
  return { body } as Partial<Request>;
}

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('validateAnalysisRequestMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
  });

  it('should call next() for valid request', () => {
    const req = mockReq({
      job_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'email_text',
      content: 'test content',
    });
    const res = mockRes();

    validateAnalysisRequestMiddleware(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 when job_id is missing', () => {
    const req = mockReq({ type: 'email_text', content: 'test' });
    const res = mockRes();

    validateAnalysisRequestMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 400 when job_id is not a valid UUID', () => {
    const req = mockReq({ job_id: 'not-a-uuid', type: 'email_text', content: 'test' });
    const res = mockRes();

    validateAnalysisRequestMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('UUID') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 422 when type is invalid', () => {
    const req = mockReq({
      job_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'invalid_type',
      content: 'test',
    });
    const res = mockRes();

    validateAnalysisRequestMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 400 when content is missing', () => {
    const req = mockReq({
      job_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'email_text',
    });
    const res = mockRes();

    validateAnalysisRequestMiddleware(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should attach validatedBody to request on success', () => {
    const req = mockReq({
      job_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'plain_text',
      content: 'hello world',
    }) as any;
    const res = mockRes();

    validateAnalysisRequestMiddleware(req as Request, res as unknown as Response, next);

    expect(req.validatedBody).toBeDefined();
    expect(req.validatedBody.job_id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
