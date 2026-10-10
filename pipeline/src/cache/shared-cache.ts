import { getAnalysisCache } from './cache-manager';
import { getRedis } from '../queue/redis';

/**
 * Cache of analysis results.
 *
 * With Redis configured the cache is shared by every pipeline instance and
 * survives restarts; without it, results are kept in this process's memory.
 * A Redis failure never fails a request: the cache is simply missed.
 */

const KEY_PREFIX = 'vns:analysis:';

export async function getCachedAnalysis<T>(key: string, ttlMs: number, maxSize: number): Promise<T | null> {
  const redis = getRedis();

  if (redis) {
    try {
      const raw = await redis.get(KEY_PREFIX + key);
      if (raw) return JSON.parse(raw) as T;
      return null;
    } catch {
      // fall through to the in-memory cache
    }
  }

  return getAnalysisCache(ttlMs, maxSize).get(key) as T | null;
}

export async function setCachedAnalysis<T>(key: string, value: T, ttlMs: number, maxSize: number): Promise<void> {
  const redis = getRedis();

  if (redis) {
    try {
      await redis.set(KEY_PREFIX + key, JSON.stringify(value), 'PX', ttlMs);
      return;
    } catch {
      // fall through to the in-memory cache
    }
  }

  getAnalysisCache(ttlMs, maxSize).set(key, value);
}
