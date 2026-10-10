import IORedis from 'ioredis';
import { getConfig } from '../config/config';
import { logger } from '../logger/logger';

/**
 * Redis connections. Redis is optional: when REDIS_URL is not set the
 * pipeline keeps its cache in memory and runs jobs in-process.
 */

let sharedClient: IORedis | null = null;

export function getRedisUrl(): string | undefined {
  try {
    return getConfig().redisUrl || undefined;
  } catch {
    return undefined;
  }
}

/** Connection for ordinary commands (cache). Null when Redis is not configured. */
export function getRedis(): IORedis | null {
  const url = getRedisUrl();
  if (!url) return null;

  if (!sharedClient) {
    sharedClient = new IORedis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false });
    sharedClient.on('error', error => {
      logger.warn({ event: 'redis.error', error: error.message });
    });
  }
  return sharedClient;
}

/** A dedicated connection for BullMQ, which needs blocking commands. */
export function createBullConnection(): IORedis {
  const url = getRedisUrl();
  if (!url) throw new Error('REDIS_URL is not configured');

  const connection = new IORedis(url, { maxRetriesPerRequest: null });
  connection.on('error', error => {
    logger.warn({ event: 'redis.error', error: error.message });
  });
  return connection;
}

export async function closeRedis(): Promise<void> {
  if (sharedClient) {
    const client = sharedClient;
    sharedClient = null;
    await client.quit().catch(() => client.disconnect());
  }
}
