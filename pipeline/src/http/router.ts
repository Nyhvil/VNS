import { Router, Request, Response } from 'express';
import { authMiddleware } from './middleware/auth.middleware';
import { ipAllowlistMiddleware } from './middleware/ip-allowlist.middleware';
import { validateAnalysisRequestMiddleware } from './middleware/validation.middleware';
import { runAnalysis } from '../orchestrator/analysis-orchestrator';
import { AnalysisRequest, HealthResponse } from '../types';

export const router = Router();

// Track readiness state
let isReady = false;

export function setReady(ready: boolean): void {
  isReady = ready;
}

// GET /pipeline/health
router.get('/pipeline/health', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: isReady ? 'ok' : 'starting',
    timestamp: new Date().toISOString(),
  };

  res.status(isReady ? 200 : 503).json(response);
});

// POST /pipeline/analyze
router.post(
  '/pipeline/analyze',
  ipAllowlistMiddleware,
  authMiddleware,
  validateAnalysisRequestMiddleware,
  async (req: Request, res: Response) => {
    const validatedBody = (req as any).validatedBody as AnalysisRequest;

    try {
      const result = await runAnalysis(validatedBody);
      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';

      if (message === 'Analysis timeout') {
        res.status(504).json({ error: 'Analysis timeout', job_id: validatedBody.job_id });
      } else {
        res.status(500).json({ error: 'Internal server error', job_id: validatedBody.job_id });
      }
    }
  }
);
