import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from './middleware/auth.middleware';
import { ipAllowlistMiddleware } from './middleware/ip-allowlist.middleware';
import { validateAnalysisRequestMiddleware } from './middleware/validation.middleware';
import { runAnalysis } from '../orchestrator/analysis-orchestrator';
import { AnalysisRequest, HealthResponse } from '../types';
import { isQueueRunning, submitAnalysisJob, getAnalysisJob } from '../queue/analysis-queue';
import { answerQuestion, ChatRequestSchema, ChatUnavailableError } from '../chat/chat-service';
import { getConfig } from '../config/config';
import { getLlmEndpoint, getEmbeddingEndpoint } from '../config/ai-endpoints';
import { SCAM_PATTERNS, OFFICIAL_DOMAINS } from '../knowledge';

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

// GET /pipeline/status — which layers are configured on this instance
router.get('/pipeline/status', ipAllowlistMiddleware, authMiddleware, (_req: Request, res: Response) => {
  const config = getConfig();
  const llm = getLlmEndpoint(config);
  const embedding = getEmbeddingEndpoint(config);

  res.status(200).json({
    rule: { enabled: true },
    knowledge: { scam_patterns: SCAM_PATTERNS.length, official_domains: OFFICIAL_DOMAINS.length },
    ml: { configured: !!config.mlServiceUrl, confidence_threshold: config.mlConfidenceThreshold },
    rag: {
      configured: !!embedding.apiKey,
      embedding_model: embedding.model,
      collection: config.qdrantCollection,
      rerank: config.rerankEnabled !== false,
    },
    llm: {
      configured: !!config.llmEnabled && !!llm.apiKey,
      provider: config.llmProvider,
      model: llm.model,
      mode: config.llmMode,
    },
    ocr: [
      ...(config.mlServiceUrl ? ['paddleocr'] : []),
      ...(llm.apiKey ? ['vision_llm'] : []),
      'tesseract',
    ],
    queue: { running: isQueueRunning() },
  });
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

// POST /pipeline/jobs — queue an analysis and return at once (needs Redis)
router.post(
  '/pipeline/jobs',
  ipAllowlistMiddleware,
  authMiddleware,
  validateAnalysisRequestMiddleware,
  async (req: Request, res: Response) => {
    const validatedBody = (req as any).validatedBody as AnalysisRequest;

    if (!isQueueRunning()) {
      res.status(503).json({ error: 'Queue is not enabled: REDIS_URL is not set', job_id: validatedBody.job_id });
      return;
    }

    try {
      const jobId = await submitAnalysisJob(validatedBody);
      res.status(202).json({ job_id: jobId, status: 'queued' });
    } catch {
      res.status(500).json({ error: 'Internal server error', job_id: validatedBody.job_id });
    }
  }
);

// GET /pipeline/jobs/:id — state and result of a queued analysis
router.get('/pipeline/jobs/:id', ipAllowlistMiddleware, authMiddleware, async (req: Request, res: Response) => {
  if (!isQueueRunning()) {
    res.status(503).json({ error: 'Queue is not enabled: REDIS_URL is not set' });
    return;
  }

  try {
    const status = await getAnalysisJob(String(req.params['id']));
    if (!status) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.status(200).json(status);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /pipeline/chat — RAG-based chatbot
router.post('/pipeline/chat', ipAllowlistMiddleware, authMiddleware, async (req: Request, res: Response) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
    return;
  }

  try {
    const result = await answerQuestion(parsed.data, uuidv4());
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ChatUnavailableError) {
      res.status(503).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : '';
    res.status(message === 'LLM timeout' ? 504 : 500).json({
      error: message === 'LLM timeout' ? 'LLM timeout' : 'Internal server error',
    });
  }
});
