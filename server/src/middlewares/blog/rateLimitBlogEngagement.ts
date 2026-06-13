import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { RATE_LIMITS } from '../../config/rateLimits.js';
import { RedisRateLimitStore } from '../auth/redisRateLimitStore.js';

/** Repost + bookmark writes (same budget as Respect). */
export const rateLimitBlogEngagementWrite = rateLimit({
  windowMs: RATE_LIMITS.blogEngagementWrite.windowMs,
  limit: RATE_LIMITS.blogEngagementWrite.max,
  message: { message: 'Too many engagement updates. Please slow down.', success: false },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as Request & { user?: { _id?: string } }).user?._id;
    if (userId) return `u:${userId}`;
    return `ip:${ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0')}`;
  },
  handler: (_req, res) => {
    res.status(429).json({
      message: 'Too many engagement updates. Please slow down.',
      success: false,
      retryAfter: 60,
    });
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: RedisRateLimitStore('rl:blog:engagement:write:', RATE_LIMITS.blogEngagementWrite.windowMs) as any,
});
