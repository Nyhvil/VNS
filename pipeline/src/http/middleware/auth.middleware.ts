import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../../config/config';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];

  let expectedKey: string;
  try {
    expectedKey = getConfig().apiKey;
  } catch {
    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  if (!apiKey || apiKey !== expectedKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
