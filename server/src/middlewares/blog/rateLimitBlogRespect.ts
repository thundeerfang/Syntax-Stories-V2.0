import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { RedisRateLimitStore } from '../auth/redisRateLimitStore.js';

export const rateLimitBlogRespectWrite = rateLimit({
  windowMs: 60_000,
  limit: 120,
  message: { message: 'Too many Respect updates. Please slow down.', success: false },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as Request & { user?: { _id?: string } }).user?._id;
    if (userId) return `u:${userId}`;
    return `ip:${ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0')}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      message: 'Too many Respect updates. Please slow down.',
      success: false,
      retryAfter: 60,
    });
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: RedisRateLimitStore('rl:blog:respect:write:', 60_000) as any,
});
