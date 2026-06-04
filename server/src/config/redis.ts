import { createClient } from 'redis';
import { env } from './env.js';

type RedisClient = Awaited<ReturnType<typeof createClient>>;
let redisClient: RedisClient | null = null;
let redisReady = false;

function markRedisUnavailable(reason: string): void {
  if (redisReady) {
    console.warn('[Redis] Degraded —', reason);
  }
  redisReady = false;
}

function attachRedisErrorHandlers(client: RedisClient, label: string): void {
  client.on('error', (err) => {
    markRedisUnavailable(`${label}: ${(err as Error).message}`);
  });
  client.on('end', () => {
    markRedisUnavailable(`${label}: connection closed`);
  });
  client.on('ready', () => {
    redisReady = true;
    console.log(`[Redis] ${label} ready`);
  });
}

export async function connectRedis(): Promise<RedisClient | null> {
  const url = env.REDIS_URL;
  if (!url) {
    console.warn('  ⚠ REDIS_URL not set; using in-memory fallbacks.');
    return null;
  }
  try {
    const client = createClient({ url });
    attachRedisErrorHandlers(client, 'primary');
    await client.connect();
    redisClient = client;
    redisReady = true;
    console.log('[Redis] Connected');
    return client;
  } catch (err) {
    console.error(
      '[Redis] Initial connection failed (API continues without Redis):',
      (err as Error).message
    );
    redisClient = null;
    redisReady = false;
    return null;
  }
}

/** Secondary client for blocking consumers — must not take down the API process. */
export async function createRedisSubscriberClient(): Promise<RedisClient | null> {
  const url = env.REDIS_URL;
  if (!url) return null;
  try {
    const client = createClient({ url });
    attachRedisErrorHandlers(client, 'subscriber');
    await client.connect();
    return client;
  } catch (err) {
    console.warn('[Redis] Subscriber connect failed:', (err as Error).message);
    return null;
  }
}

export function getRedis(): RedisClient | null {
  return redisClient;
}

export function isRedisAvailable(): boolean {
  return redisReady && redisClient !== null && redisClient.isOpen;
}
