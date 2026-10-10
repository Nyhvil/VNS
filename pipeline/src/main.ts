import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { router, setReady } from './http/router';
import { getConfig } from './config/config';
import { logger } from './logger/logger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: false })); // Disable CORS — internal service only
app.use(express.json({ limit: '10mb' }));

// Routes
app.use(router);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function start(): Promise<void> {
  const config = getConfig();

  const server = app.listen(config.port, () => {
    logger.info({ event: 'server.started', port: config.port });
    setReady(true);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info({ event: 'server.shutdown', signal });
    setReady(false);

    server.close(() => {
      logger.info({ event: 'server.closed' });
      process.exit(0);
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
