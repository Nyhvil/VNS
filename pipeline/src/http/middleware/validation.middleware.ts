import { Request, Response, NextFunction } from 'express';
import { validateAnalysisRequest } from '../schemas/analyze.schema';

export function validateAnalysisRequestMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = validateAnalysisRequest(req.body);

  if (!result.success) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  // Attach validated data to request
  (req as any).validatedBody = result.data;
  next();
}
