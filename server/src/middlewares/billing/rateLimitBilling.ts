import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { redisKeys } from '../../shared/redis/keys.js';
import { RedisRateLimitStore } from '../auth/redisRateLimitStore.js';

function userSuffix(req: Request): string {
  const u = (req as Request & { user?: { _id: string } }).user;
  return u?._id ? `u:${u._id}` : ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0');
}

/** POST /api/billing/checkout-session — double-clicks / abuse. */
export const rateLimitCreateCheckout = rateLimit({
  windowMs: 60_000,
  limit: 10,
  message: { message: 'Too many checkout attempts. Try again shortly.', success: false },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => userSuffix(req),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: RedisRateLimitStore(redisKeys.rateLimit.createCheckout, 60_000) as any,
});

/** POST /api/billing/verify-checkout */
export const rateLimitVerifyCheckout = rateLimit({
  windowMs: 60_000,
  limit: 10,
  message: { message: 'Too many verify attempts. Try again shortly.', success: false },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => userSuffix(req),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: RedisRateLimitStore(redisKeys.rateLimit.verifyCheckout, 60_000) as any,
});
