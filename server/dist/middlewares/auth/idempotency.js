import { getRedis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { redisKeys } from '../../shared/redis/keys.js';
const memoryKeys = new Map();
const IDEMPOTENCY_TTL_SEC = env.IDEMPOTENCY_TTL_SEC;
export async function idempotency(req, res, next) {
    const key = req.get('X-Idempotency-Key') ?? req.get('x-idempotency-key');
    if (!key || key.length > 256) {
        next();
        return;
    }
    const storeKey = redisKeys.idempotency(key);
    const client = getRedis();
    if (client) {
        try {
            const exists = await client.get(storeKey);
            if (exists) {
                res.status(409).json({
                    message: 'Duplicate request (idempotency key already used).',
                    success: false,
                });
                return;
            }
            await client.setEx(storeKey, IDEMPOTENCY_TTL_SEC, '1');
            res.setHeader('X-Idempotency-Key-Status', 'accepted');
            next();
            return;
        }
        catch {
            next();
            return;
        }
    }
    if (memoryKeys.has(storeKey)) {
        res.status(409).json({
            message: 'Duplicate request (idempotency key already used).',
            success: false,
        });
        return;
    }
    memoryKeys.set(storeKey, Date.now());
    setTimeout(() => memoryKeys.delete(storeKey), IDEMPOTENCY_TTL_SEC * 1000);
    res.setHeader('X-Idempotency-Key-Status', 'accepted');
    next();
}
//# sourceMappingURL=idempotency.js.map