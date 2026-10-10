import * as crypto from 'crypto';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttlMs: number;
  private maxSize: number;

  constructor(ttlMs: number, maxSize: number) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  set(key: string, value: T): void {
    // Evict if max size is reached
    if (this.cache.size >= this.maxSize) {
      this.evict();
    }

    const expiresAt = Date.now() + this.ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.cleanupExpired();
    return this.cache.size;
  }

  private evict(): void {
    this.cleanupExpired();
    
    if (this.cache.size >= this.maxSize) {
      // FIFO eviction: remove the first key in the map iterator
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instances
let _analysisCache: SimpleCache<any> | null = null;
let _ocrCache: SimpleCache<any> | null = null;

export function getAnalysisCache(ttlMs = 300000, maxSize = 1000): SimpleCache<any> {
  if (!_analysisCache) {
    _analysisCache = new SimpleCache<any>(ttlMs, maxSize);
  }
  return _analysisCache;
}

export function getOcrCache(ttlMs = 86400000, maxSize = 1000): SimpleCache<any> {
  // OCR can be cached longer (e.g. 24 hours) since image text doesn't change
  if (!_ocrCache) {
    _ocrCache = new SimpleCache<any>(ttlMs, maxSize);
  }
  return _ocrCache;
}

export function resetCaches(): void {
  if (_analysisCache) _analysisCache.clear();
  if (_ocrCache) _ocrCache.clear();
}

/**
 * Creates a unique SHA256 hash for a given string content to use as cache key.
 */
export function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
