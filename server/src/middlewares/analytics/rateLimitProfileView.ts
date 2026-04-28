import type { Request, Response, NextFunction } from 'express';
import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';

const LIMIT = 100;
const WINDOW_SECONDS = 60;

export async function rateLimitProfileView(req: Request, res: Response, next: NextFunction): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    next();
    return;
  }

  const ip = (req.ip ?? 'unknown').trim();
  const key = redisKeys.analytics.rateLimitProfileView(ip);

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    if (count > LIMIT) {
      res.status(429).json({ success: false, message: 'Too many analytics events from this IP. Try again later.' });
      return;
    }
  } catch {
    // On Redis error, fail open
  }

  next();
}

