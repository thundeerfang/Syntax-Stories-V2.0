import { createClient } from 'redis';
import { env } from './env';

type RedisClient = Awaited<ReturnType<typeof createClient>>;
let redisClient: RedisClient | null = null;
let redisReady = false;

export async function connectRedis(): Promise<RedisClient | null> {
  const url = env.REDIS_URL;
  if (!url) {
    console.warn('  ⚠ REDIS_URL not set; using in-memory fallbacks.');
    return null;
  }
  try {
    const client = createClient({ url });
    client.on('error', (err) => console.error('Redis error:', err.message));
    await client.connect();
    redisClient = client;
    redisReady = true;
    console.log('[Redis] Connected');
    return client;
  } catch (err) {
    console.warn('  ⚠ Redis connection failed:', (err as Error).message);
    return null;
  }
}

export function getRedis(): RedisClient | null {
  return redisClient;
}

export function isRedisAvailable(): boolean {
  return redisReady && redisClient !== null;
}
