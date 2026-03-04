import { privateKey, publicKey } from './keys';
import { env } from './env';

export const authConfig = {
  JWT_ACCESS_PRIVATE_KEY: privateKey,
  JWT_ACCESS_PUBLIC_KEY: publicKey,
  JWT_ALGORITHM: 'RS256' as const,
  ACCESS_TOKEN_EXPIRY: env.JWT_ACCESS_EXPIRY,
  REFRESH_TOKEN_EXPIRY: env.JWT_REFRESH_EXPIRY,
  FRONTEND_URL: env.FRONTEND_URL,
  OTP_TTL_SECONDS: 600,
  RATE_LIMIT_SEND_OTP: { windowMs: 15 * 60 * 1000, max: 5 },
  RATE_LIMIT_VERIFY_OTP: { windowMs: 15 * 60 * 1000, max: 10 },
  RATE_LIMIT_REFRESH: { windowMs: 60 * 1000, max: 30 },
  RATE_LIMIT_SIGNUP: { windowMs: 60 * 60 * 1000, max: 5 },
};
