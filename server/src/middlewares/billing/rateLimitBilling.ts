import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import { redisKeys } from "../../shared/redis/keys.js";
import { RATE_LIMITS } from "../../config/rateLimits.js";
import { RedisRateLimitStore } from "../auth/redisRateLimitStore.js";
function userSuffix(req: Request): string {
  const u = (
    req as Request & {
      user?: {
        _id: string;
      };
    }
  ).user;
  return u?._id
    ? `u:${u._id}`
    : ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? "0.0.0.0");
}
export const rateLimitCreateCheckout = rateLimit({
  windowMs: RATE_LIMITS.billingCheckout.windowMs,
  limit: RATE_LIMITS.billingCheckout.max,
  message: {
    message: "Too many checkout attempts. Try again shortly.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => userSuffix(req),
  store: RedisRateLimitStore(
    redisKeys.rateLimit.createCheckout,
    RATE_LIMITS.billingCheckout.windowMs,
  ) as any,
});
export const rateLimitVerifyCheckout = rateLimit({
  windowMs: RATE_LIMITS.billingVerify.windowMs,
  limit: RATE_LIMITS.billingVerify.max,
  message: {
    message: "Too many verify attempts. Try again shortly.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => userSuffix(req),
  store: RedisRateLimitStore(
    redisKeys.rateLimit.verifyCheckout,
    RATE_LIMITS.billingVerify.windowMs,
  ) as any,
});
