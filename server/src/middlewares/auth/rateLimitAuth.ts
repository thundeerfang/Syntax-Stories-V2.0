import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authConfig } from '../../config/auth.config';
import { RedisRateLimitStore } from './redisRateLimitStore';

function createRateLimiter(
  windowMs: number,
  max: number,
  prefix: string
): ReturnType<typeof rateLimit> {
  const store = RedisRateLimitStore(prefix, windowMs);
  return rateLimit({
    windowMs,
    limit: max,
    message: { message: 'Too many attempts. Please try again later.', success: false },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '0.0.0.0'),
    handler: (req, res) => {
      res.status(429).json({
        message: 'Too many attempts. Please try again later.',
        success: false,
        retryAfter: 60,
      });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: store as any,
  });
}

export const rateLimitSendOtp = createRateLimiter(
  authConfig.RATE_LIMIT_SEND_OTP.windowMs,
  authConfig.RATE_LIMIT_SEND_OTP.max,
  'rl:sendotp:'
);
export const rateLimitVerifyOtp = createRateLimiter(
  authConfig.RATE_LIMIT_VERIFY_OTP.windowMs,
  authConfig.RATE_LIMIT_VERIFY_OTP.max,
  'rl:verifyotp:'
);
export const rateLimitSignupEmail = createRateLimiter(
  authConfig.RATE_LIMIT_SIGNUP.windowMs,
  authConfig.RATE_LIMIT_SIGNUP.max,
  'rl:signupemail:'
);
export const rateLimitRefresh = createRateLimiter(
  authConfig.RATE_LIMIT_REFRESH.windowMs,
  authConfig.RATE_LIMIT_REFRESH.max,
  'rl:refresh:'
);
