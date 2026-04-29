import { createClient } from 'redis';
import { env } from './env.js';
let redisClient = null;
let redisReady = false;
export async function connectRedis() {
    const url = env.REDIS_URL;
    if (!url) {
        console.warn('  ⚠ REDIS_URL not set; using in-memory fallbacks.');
        return null;
    }
    try {
        const client = createClient({ url });
        client.on('error', (err) => {
            console.error('[Redis] Connection error:', err.message);
            process.exit(1);
        });
        await client.connect();
        redisClient = client;
        redisReady = true;
        console.log('[Redis] Connected');
        return client;
    }
    catch (err) {
        console.error('[Redis] Connection failed:', err.message);
        process.exit(1);
    }
    return null;
}
export function getRedis() {
    return redisClient;
}
export function isRedisAvailable() {
    return redisReady && redisClient !== null;
}
//# sourceMappingURL=redis.js.map