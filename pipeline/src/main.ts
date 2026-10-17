import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { createApp, AppOptions } from './app';
import { setReady } from './http/router';
import { getConfig, Config } from './config/config';
import { getLlmEndpoint } from './config/ai-endpoints';
import { logger } from './logger/logger';
import { performAnalysis, runAnalysis } from './orchestrator/analysis-orchestrator';
import { answerQuestion } from './chat/chat-service';
import { storeContentToVectorDb } from './rag/rag-analyzer';
import type { StoredLabel } from './rag/rag-analyzer';
import { startQueues, stopQueues } from './queue/analysis-queue';
import { closeRedis } from './queue/redis';
import { createAccountStore, createStore } from './web/create-store';
import { AccountService } from './web/accounts/account-service';
import type { AccountStore } from './web/accounts/account-store';
import type { DataStore } from './web/store';
import { ParsedContent } from './types';

interface VectorStorePayload {
  content: ParsedContent;
  jobId: string;
  score: number;
  label: StoredLabel;
}

/** Where the built web app is: WEB_DIST_DIR, or dist/ in the repository root. */
function resolveWebDistDir(config: Config): string {
  return path.resolve(config.webDistDir ?? path.join(__dirname, '..', '..', 'dist'));
}

/** Set up the standalone web server (WEB_ENABLED=true): storage and web app. */
async function prepareWeb(
  config: Config
): Promise<{ web: AppOptions['web']; store: DataStore | null; accountStore: AccountStore | null }> {
  if (!config.webEnabled) return { web: undefined, store: null, accountStore: null };

  const store = await createStore(config, (attempt, error) =>
    logger.warn({ event: 'web.database_retry', attempt, error: String(error) })
  );
  const accountStore = config.accountsEnabled ? await createAccountStore(store, config) : null;
  const accounts = accountStore
    ? new AccountService(accountStore, { guestDailyLimitPerIp: config.guestDailyLimitPerIp })
    : undefined;
  logger.info({ event: 'web.accounts', enabled: !!accounts, payment_mode: config.paymentMode });
  if (accounts && config.paymentMode === 'demo') {
    logger.warn({
      event: 'web.payment_demo',
      message: 'PAYMENT_MODE=demo: buyers can mark their own orders paid. Do not use with real money.',
    });
  }

  const distDir = resolveWebDistDir(config);
  const hasWebApp = fs.existsSync(path.join(distDir, 'index.html'));

  logger.info({ event: 'web.enabled', storage: store.kind, web_app: hasWebApp ? distDir : null });
  if (!hasWebApp) {
    logger.warn({
      event: 'web.no_build',
      message: `No web app in ${distDir}: run "npm run build:standalone" in the repository root. Only the API is served.`,
    });
  }
  if (store.kind === 'file') {
    logger.warn({
      event: 'web.file_storage',
      message: 'DATABASE_URL is not set: data is kept in files and is lost when the disk is reset.',
    });
  }
  if (!config.adminPassword) {
    logger.warn({ event: 'web.no_admin_password', message: 'ADMIN_PASSWORD is not set: the admin page is closed.' });
  }
  if (!config.llmEnabled || !getLlmEndpoint(config).apiKey) {
    logger.warn({
      event: 'web.no_llm',
      message: 'No LLM configured: analysis uses rules only, and the chatbot and image reading by AI are off.',
    });
  }

  return {
    store,
    accountStore,
    web: {
      distDir: hasWebApp ? distDir : null,
      deps: {
        store,
        accounts,
        payment: {
          mode: config.paymentMode,
          bankName: config.paymentBankName,
          accountNumber: config.paymentAccountNumber,
          accountName: config.paymentAccountName,
        },
        analyze: runAnalysis,
        chat: answerQuestion,
        logError: (event, error) =>
          logger.error({ event, error: error instanceof Error ? error.message : String(error) }),
        settings: {
          adminPassword: config.adminPassword,
          storeImages: config.storeImages,
          trustedProxyHops: config.trustedProxyHops,
          rateLimitPerIp: config.rateLimitPerIp,
          rateLimitWindowMs: config.rateLimitWindowMs,
          rateLimitGlobalPerMinute: config.rateLimitGlobalPerMinute,
        },
      },
    },
  };
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

  const { web, store, accountStore } = await prepareWeb(config);
  const app = createApp({ web });

  const server = app.listen(config.port, () => {
    logger.info({ event: 'server.started', port: config.port, web: !!web });
    setReady(true);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info({ event: 'server.shutdown', signal });
    setReady(false);

    server.close(() => {
      Promise.allSettled([stopQueues(), closeRedis(), (accountStore ? accountStore.close() : Promise.resolve()).then(() => store?.close())]).finally(() => {
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

