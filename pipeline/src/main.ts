import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { router, setReady } from './http/router';
import { getConfig } from './config/config';
import { logger } from './logger/logger';
import { performAnalysis } from './orchestrator/analysis-orchestrator';
import { storeContentToVectorDb } from './rag/rag-analyzer';
import type { StoredLabel } from './rag/rag-analyzer';
import { startQueues, stopQueues } from './queue/analysis-queue';
import { closeRedis } from './queue/redis';
import { ParsedContent } from './types';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: false })); // Disable CORS — internal service only
// Screenshots arrive as base64, which is about a third larger than the file.
app.use(express.json({ limit: '15mb' }));

// Routes
app.use(router);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

interface VectorStorePayload {
  content: ParsedContent;
  jobId: string;
  score: number;
  label: StoredLabel;
}

// Start server
async function start(): Promise<void> {
  const config = getConfig();

  // With REDIS_URL set, analyses and vector-store writes go through BullMQ.
  try {
    const queueStarted = await startQueues({
      analyze: request => performAnalysis(request),
      storeVector: async payload => {
        const { content, jobId, score, label } = payload as VectorStorePayload;
        await storeContentToVectorDb(content, jobId, score, label);
      },
    });
    logger.info({ event: 'queue.mode', mode: queueStarted ? 'bullmq' : 'in_process' });
  } catch (error) {
    // Redis being down must not keep the service from answering.
    logger.error({ event: 'queue.start_failed', error: String(error) });
  }

  const server = app.listen(config.port, () => {
    logger.info({ event: 'server.started', port: config.port });
    setReady(true);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info({ event: 'server.shutdown', signal });
    setReady(false);

    server.close(() => {
      Promise.allSettled([stopQueues(), closeRedis()]).finally(() => {
        logger.info({ event: 'server.closed' });
        process.exit(0);
      });
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      logger.error({ event: 'server.force_exit' });
      process.exit(1);
    }, 30_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch(err => {
  logger.error({ event: 'server.start_failed', error: String(err) });
  process.exit(1);
});

export { app };
