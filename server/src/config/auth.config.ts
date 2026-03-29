import { privateKey, publicKey } from './keys.js';
import { env } from './env.js';

export const authConfig = {
  JWT_ACCESS_PRIVATE_KEY: privateKey,
  JWT_ACCESS_PUBLIC_KEY: publicKey,
  JWT_ALGORITHM: 'RS256' as const,
  ACCESS_TOKEN_EXPIRY: env.JWT_ACCESS_EXPIRY,
  REFRESH_TOKEN_EXPIRY: env.JWT_REFRESH_EXPIRY,
  FRONTEND_URL: env.FRONTEND_URL,
  /** @deprecated use OTP_LOGIN_TTL_SECONDS / OTP_SIGNUP_TTL_SECONDS */
  OTP_TTL_SECONDS: env.OTP_SIGNUP_TTL_SECONDS,
  OTP_LOGIN_TTL_SECONDS: env.OTP_LOGIN_TTL_SECONDS,
  OTP_SIGNUP_TTL_SECONDS: env.OTP_SIGNUP_TTL_SECONDS,
  OTP_MIN_RESEND_SECONDS: env.OTP_MIN_RESEND_SECONDS,
  RATE_LIMIT_SEND_OTP: { windowMs: 15 * 60 * 1000, max: 5 },
  RATE_LIMIT_VERIFY_OTP: { windowMs: 15 * 60 * 1000, max: 10 },
  RATE_LIMIT_REFRESH: { windowMs: 60 * 1000, max: 30 },
  RATE_LIMIT_SIGNUP: { windowMs: 60 * 60 * 1000, max: 5 },
  /** Profile PATCH (legacy + section routes): per-IP, limits spam rewrites and audit noise. */
  RATE_LIMIT_UPDATE_PROFILE: { windowMs: 15 * 60 * 1000, max: 120 },
};
