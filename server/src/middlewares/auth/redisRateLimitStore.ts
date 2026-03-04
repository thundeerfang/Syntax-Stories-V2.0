import type { Options } from 'express-rate-limit';
import { getRedis } from '../../config/redis';

interface StoreResult {
  totalHits: number;
  resetTime: Date;
}

export function RedisRateLimitStore(prefix: string, windowMs: number): Options['store'] {
  const fullPrefix = prefix ?? 'rl:';
  const localStore = new Map<string, { count: number; resetAt: number }>();

  const localIncrement = (key: string): StoreResult => {
    const now = Date.now();
    let record = localStore.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      localStore.set(key, record);
    }
    record.count += 1;
    return { totalHits: record.count, resetTime: new Date(record.resetAt) };
  };

  return {
    async increment(key: string): Promise<StoreResult> {
      const client = getRedis();
      const fullKey = fullPrefix + key;
      if (client) {
        try {
          const totalHits = await client.incr(fullKey);
          let ttl = await client.pTTL(fullKey);
          if (ttl === -1) {
            await client.pExpire(fullKey, windowMs);
            ttl = windowMs;
          }
          return { totalHits, resetTime: new Date(Date.now() + ttl) };
        } catch {
          return localIncrement(key);
        }
      }
      return localIncrement(key);
    },
    async decrement(key: string): Promise<void> {
      const client = getRedis();
      if (client) {
        try {
          await client.decr(fullPrefix + key);
        } catch {}
      }
    },
    async resetKey(key: string): Promise<void> {
      const client = getRedis();
      if (client) {
        try {
          await client.del(fullPrefix + key);
        } catch {}
      }
      localStore.delete(key);
    },
  };
}
