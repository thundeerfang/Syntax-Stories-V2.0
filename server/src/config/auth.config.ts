import { privateKey, publicKey } from './keys.js';
import { env } from './env.js';

import { RATE_LIMITS } from './rateLimits.js';

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
  RATE_LIMIT_SEND_OTP: RATE_LIMITS.sendOtp,
  RATE_LIMIT_VERIFY_OTP: RATE_LIMITS.verifyOtp,
  RATE_LIMIT_REFRESH: RATE_LIMITS.refresh,
  RATE_LIMIT_SIGNUP: RATE_LIMITS.signup,
  /** Profile PATCH (legacy + section routes): per-IP, limits spam rewrites and audit noise. */
  RATE_LIMIT_UPDATE_PROFILE: RATE_LIMITS.updateProfile,
  /** GET /api/invites/resolve — per IP. */
  RATE_LIMIT_INVITE_RESOLVE: RATE_LIMITS.inviteResolve,
};
