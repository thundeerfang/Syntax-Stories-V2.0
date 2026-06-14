import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import { RedisRateLimitStore } from "../auth/redisRateLimitStore.js";
export const rateLimitFollowWrite = rateLimit({
  windowMs: 10000,
  limit: 10,
  message: {
    message: "Too many follow actions. Please slow down.",
    success: false,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (
      req as Request & {
        user?: {
          _id?: string;
        };
      }
    ).user?._id;
    if (userId) return `u:${userId}`;
    return `ip:${ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? "0.0.0.0")}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many follow actions. Please slow down.",
      success: false,
      retryAfter: 10,
    });
  },
  store: RedisRateLimitStore("rl:follow:write:", 10000) as any,
});
