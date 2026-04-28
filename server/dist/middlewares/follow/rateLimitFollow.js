import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisRateLimitStore } from '../auth/redisRateLimitStore.js';
// Follow/unfollow endpoints are write-heavy and attractive for abuse.
// We rate-limit per authenticated user when possible, otherwise fallback to IP.
export const rateLimitFollowWrite = rateLimit({
    windowMs: 10_000, // 10s
    limit: 10, // 10 follow/unfollow writes per 10 seconds
    message: { message: 'Too many follow actions. Please slow down.', success: false },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const userId = req.user?._id;
        if (userId)
            return `u:${userId}`;
        return `ip:${ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0')}`;
    },
    handler: (req, res) => {
        res.status(429).json({
            message: 'Too many follow actions. Please slow down.',
            success: false,
            retryAfter: 10,
        });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: RedisRateLimitStore('rl:follow:write:', 10_000),
});
//# sourceMappingURL=rateLimitFollow.js.map