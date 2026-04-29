import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';
export function RedisRateLimitStore(prefix, windowMs) {
    const fullPrefix = prefix ?? 'rl:';
    const localStore = new Map();
    const localIncrement = (key) => {
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
        async increment(key) {
            const client = getRedis();
            const fullKey = redisKeys.rateLimit.authHttpKey(fullPrefix, key);
            if (client) {
                try {
                    const totalHits = await client.incr(fullKey);
                    let ttl = await client.pTTL(fullKey);
                    if (ttl === -1) {
                        await client.pExpire(fullKey, windowMs);
                        ttl = windowMs;
                    }
                    return { totalHits, resetTime: new Date(Date.now() + ttl) };
                }
                catch {
                    return localIncrement(key);
                }
            }
            return localIncrement(key);
        },
        async decrement(key) {
            const client = getRedis();
            if (client) {
                try {
                    await client.decr(redisKeys.rateLimit.authHttpKey(fullPrefix, key));
                }
                catch { }
            }
        },
        async resetKey(key) {
            const client = getRedis();
            if (client) {
                try {
                    await client.del(redisKeys.rateLimit.authHttpKey(fullPrefix, key));
                }
                catch { }
            }
            localStore.delete(key);
        },
    };
}
//# sourceMappingURL=redisRateLimitStore.js.map