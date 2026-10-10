import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import IORedis from 'ioredis';
import { AnalysisRequest, AnalysisResponse } from '../types';
import { getConfig } from '../config/config';
import { logger } from '../logger/logger';
import { createBullConnection, getRedisUrl } from './redis';

/**
 * Job queues on Redis (BullMQ).
 *
 * - vns-analysis:      one job per analysis request. The HTTP handler waits
 *                      for the job, so callers still get a normal response,
 *                      while the number of analyses running at once is capped
 *                      by QUEUE_CONCURRENCY and jobs survive a busy period.
 * - vns-vector-store:  saving analysed content to the vector DB, retried on
 *                      failure without holding up the response.
 *
 * Queues only exist when REDIS_URL is set. Without Redis every function here
 * reports "not running" and the caller does the work in-process.
 */

export const ANALYSIS_QUEUE = 'vns-analysis';
export const VECTOR_STORE_QUEUE = 'vns-vector-store';

export interface QueueHandlers {
  analyze(request: AnalysisRequest): Promise<AnalysisResponse>;
  storeVector(payload: unknown): Promise<void>;
}

interface Runtime {
  connections: IORedis[];
  analysisQueue: Queue;
  analysisEvents: QueueEvents;
  analysisWorker: Worker;
  storeQueue: Queue;
  storeWorker: Worker;
}

let runtime: Runtime | null = null;

export function isQueueRunning(): boolean {
  return runtime !== null;
}

export async function startQueues(handlers: QueueHandlers): Promise<boolean> {
  if (runtime) return true;
  if (!getRedisUrl()) return false;

  const config = getConfig();
  const concurrency = config.queueConcurrency ?? 4;
  const prefix = config.queuePrefix ?? 'bull';
  const connections: IORedis[] = [];
  const connect = () => {
    const connection = createBullConnection();
    connections.push(connection);
    return connection;
  };

  const analysisQueue = new Queue(ANALYSIS_QUEUE, {
    connection: connect(),
    prefix,
    defaultJobOptions: {
      removeOnComplete: { age: 600, count: 1000 },
      removeOnFail: { age: 3600, count: 1000 },
    },
  });
  const analysisEvents = new QueueEvents(ANALYSIS_QUEUE, { connection: connect(), prefix });
  const analysisWorker = new Worker(
    ANALYSIS_QUEUE,
    async (job: Job) => handlers.analyze(job.data as AnalysisRequest),
    { connection: connect(), concurrency, prefix }
  );

  const storeQueue = new Queue(VECTOR_STORE_QUEUE, {
    connection: connect(),
    prefix,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 600, count: 1000 },
      removeOnFail: { age: 86400, count: 1000 },
    },
  });
  const storeWorker = new Worker(
    VECTOR_STORE_QUEUE,
    async (job: Job) => handlers.storeVector(job.data),
    { connection: connect(), concurrency: 2, prefix }
  );

  for (const worker of [analysisWorker, storeWorker]) {
    worker.on('failed', (job, error) => {
      logger.error({ event: 'queue.job_failed', queue: worker.name, job_id: job?.id, error: error.message });
    });
  }

  await Promise.all([analysisEvents.waitUntilReady(), analysisWorker.waitUntilReady(), storeWorker.waitUntilReady()]);

  runtime = { connections, analysisQueue, analysisEvents, analysisWorker, storeQueue, storeWorker };
  logger.info({ event: 'queue.started', concurrency });
  return true;
}

/** Put the request on the queue and wait for its result. */
export async function runAnalysisJob(request: AnalysisRequest, timeoutMs: number): Promise<AnalysisResponse> {
  if (!runtime) throw new Error('Queue is not running');

  const job = await runtime.analysisQueue.add('analyze', request);

  try {
    return (await job.waitUntilFinished(runtime.analysisEvents, timeoutMs)) as AnalysisResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/timed out/i.test(message)) {
      throw new Error('Analysis timeout');
    }
    throw error;
  }
}

/** Put the request on the queue and return at once; poll with getAnalysisJob. */
export async function submitAnalysisJob(request: AnalysisRequest): Promise<string> {
  if (!runtime) throw new Error('Queue is not running');

  const job = await runtime.analysisQueue.add('analyze', request, { jobId: request.job_id });
  return String(job.id);
}

export type AnalysisJobState = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';

export interface AnalysisJobStatus {
  job_id: string;
  state: AnalysisJobState;
  result?: AnalysisResponse;
  error?: string;
}

export async function getAnalysisJob(jobId: string): Promise<AnalysisJobStatus | null> {
  if (!runtime) throw new Error('Queue is not running');

  const job = await runtime.analysisQueue.getJob(jobId);
  if (!job) return null;

  const rawState = await job.getState();
  const known: AnalysisJobState[] = ['waiting', 'active', 'completed', 'failed', 'delayed'];
  const state = known.includes(rawState as AnalysisJobState) ? (rawState as AnalysisJobState) : 'unknown';

  return {
    job_id: jobId,
    state,
    ...(state === 'completed' ? { result: job.returnvalue as AnalysisResponse } : {}),
    ...(state === 'failed' ? { error: 'Analysis failed' } : {}),
  };
}

/** Queue a vector-store write. Returns false when no queue is running. */
export async function enqueueVectorStore(payload: unknown): Promise<boolean> {
  if (!runtime) return false;
  await runtime.storeQueue.add('store', payload);
  return true;
}

export async function stopQueues(): Promise<void> {
  if (!runtime) return;
  const current = runtime;
  runtime = null;

  await Promise.allSettled([current.analysisWorker.close(), current.storeWorker.close()]);
  await Promise.allSettled([current.analysisQueue.close(), current.storeQueue.close(), current.analysisEvents.close()]);
  await Promise.allSettled(current.connections.map(c => c.quit().catch(() => c.disconnect())));
}
