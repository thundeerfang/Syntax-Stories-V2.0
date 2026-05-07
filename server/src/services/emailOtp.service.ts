import crypto from 'node:crypto';
import type { Response } from 'express';
import { authConfig } from '../config/auth.config.js';
import { env } from '../config/env.js';
import { getRedis } from '../config/redis.js';
import { redisKeys } from '../shared/redis/keys.js';

export type EmailOtpPurpose = 'login' | 'signup';

const OTP_SEND_MAX_IN_WINDOW = 10;
const OTP_SEND_WINDOW_SEC = 10 * 60;
const OTP_SEND_COOLDOWN_SEC = [10 * 60, 20 * 60, 30 * 60, 60 * 60] as const;
const OTP_SEND_STRIKE_TTL_SEC = 90 * 24 * 3600;

function ttlForPurpose(purpose: EmailOtpPurpose): number {
  const sec =
    purpose === 'login' ? authConfig.OTP_LOGIN_TTL_SECONDS : authConfig.OTP_SIGNUP_TTL_SECONDS;
  return Math.max(60, Math.ceil(Number.isFinite(sec) ? sec : 600));
}

function otpPepper(): string {
  const p = (env.OTP_PEPPER ?? process.env.JWT_SECRET ?? '').trim();
  if (!p && process.env.NODE_ENV === 'production') {
    console.error('[emailOtp] Set OTP_PEPPER or JWT_SECRET for email OTP hashing.');
  }
  return p || 'dev-otp-pepper-not-for-production';
}

/** HMAC-SHA256 hex — raw OTP never stored in Redis. */
export function hashEmailOtp(emailNorm: string, code: string): string {
  return crypto.createHmac('sha256', otpPepper()).update(`${emailNorm}:${code}`).digest('hex');
}

export function verifyEmailOtpHash(storedHex: string, emailNorm: string, code: string): boolean {
  try {
    const a = Buffer.from(storedHex, 'hex');
    const b = Buffer.from(hashEmailOtp(emailNorm, code), 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function generateEmailOtpDigits(): string {
  return String(crypto.randomInt(100000, 999999));
}

export interface StoredLoginOtp {
  h: string;
  /** Monotonic per send; omit on legacy keys. */
  v?: number;
}

export interface StoredSignupOtp {
  h: string;
  fullName: string;
  v?: number;
}

export async function storeEmailOtpLogin(emailNorm: string, code: string): Promise<number> {
  const redis = getRedis();
  if (!redis) throw new Error('Redis required for OTP');
  const v = await redis.incr(redisKeys.otp.codeVer('login', emailNorm));
  const payload: StoredLoginOtp = { h: hashEmailOtp(emailNorm, code), v };
  await redis.setEx(
    redisKeys.otp.storage('login', emailNorm),
    ttlForPurpose('login'),
    JSON.stringify(payload)
  );
  return v;
}

export async function storeEmailOtpSignup(
  emailNorm: string,
  code: string,
  fullName: string
): Promise<number> {
  const redis = getRedis();
  if (!redis) throw new Error('Redis required for OTP');
  const v = await redis.incr(redisKeys.otp.codeVer('signup', emailNorm));
  const payload: StoredSignupOtp = { h: hashEmailOtp(emailNorm, code), fullName, v };
  await redis.setEx(
    redisKeys.otp.storage('signup', emailNorm),
    ttlForPurpose('signup'),
    JSON.stringify(payload)
  );
  return v;
}

export async function getStoredLoginOtp(emailNorm: string): Promise<StoredLoginOtp | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(redisKeys.otp.storage('login', emailNorm));
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as StoredLoginOtp;
    return o?.h && typeof o.h === 'string' ? o : null;
  } catch {
    return null;
  }
}

export async function getStoredSignupOtp(emailNorm: string): Promise<StoredSignupOtp | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(redisKeys.otp.storage('signup', emailNorm));
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as StoredSignupOtp;
    return o?.h && typeof o.h === 'string' && typeof o.fullName === 'string' ? o : null;
  } catch {
    return null;
  }
}

export async function deleteEmailOtp(purpose: EmailOtpPurpose, emailNorm: string): Promise<void> {
  const redis = getRedis();
  if (redis) await redis.del(redisKeys.otp.storage(purpose, emailNorm));
}

/** Avoid stale dual challenges: only one purpose active per email at a time. */
export async function invalidateOppositeEmailOtp(purpose: EmailOtpPurpose, emailNorm: string): Promise<void> {
  const other: EmailOtpPurpose = purpose === 'login' ? 'signup' : 'login';
  await deleteEmailOtp(other, emailNorm);
}

/**
 * Block rapid resend: same email+purpose cannot trigger a new code within OTP_MIN_RESEND_SECONDS.
 * Call before registerEmailOtpSendOrReject and before generating a new code.
 */
export async function assertOtpMinResendOrReject(
  purpose: EmailOtpPurpose,
  normalizedEmail: string,
  res: Response
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  const key = redisKeys.otp.resendGate(purpose, normalizedEmail);
  const exists = await redis.exists(key);
  if (exists) {
    const ttl = await redis.ttl(key);
    const wait = ttl > 0 ? ttl : authConfig.OTP_MIN_RESEND_SECONDS;
    res.setHeader('Retry-After', String(wait));
    res.status(429).json({
      success: false,
      code: 'RESEND_TOO_SOON',
      message: `A code was sent recently. Wait ${wait}s before requesting another.`,
      retryAfter: wait,
    });
    return false;
  }
  return true;
}

/** After email send succeeds. */
export async function markOtpResendGate(purpose: EmailOtpPurpose, normalizedEmail: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const sec = Math.max(15, authConfig.OTP_MIN_RESEND_SECONDS);
  await redis.setEx(redisKeys.otp.resendGate(purpose, normalizedEmail), sec, '1');
}

/**
 * Per-email send budget + escalating cooldown. Call only when you will actually send a new code.
 */
export async function registerEmailOtpSendOrReject(
  normalizedEmail: string,
  res: Response
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;

  const lockKey = redisKeys.otp.sendLock(normalizedEmail);
  const countKey = redisKeys.otp.sendCount(normalizedEmail);
  const strikeKey = redisKeys.otp.sendStrike(normalizedEmail);

  const lockTtl = await redis.ttl(lockKey);
  if (lockTtl > 0) {
    res.setHeader('Retry-After', String(lockTtl));
    res.status(429).json({
      success: false,
      message: `Too many verification codes sent to this address. Try again in ${Math.ceil(lockTtl / 60)} minute(s).`,
      retryAfter: lockTtl,
    });
    return false;
  }

  const cnt = await redis.incr(countKey);
  if (cnt === 1) {
    await redis.expire(countKey, OTP_SEND_WINDOW_SEC);
  }
  if (cnt <= OTP_SEND_MAX_IN_WINDOW) {
    return true;
  }

  await redis.del(countKey);
  const strike = await redis.incr(strikeKey);
  await redis.expire(strikeKey, OTP_SEND_STRIKE_TTL_SEC);
  const coolIdx = Math.min(Math.max(strike - 1, 0), OTP_SEND_COOLDOWN_SEC.length - 1);
  const cooldown = OTP_SEND_COOLDOWN_SEC[coolIdx];
  await redis.setEx(lockKey, cooldown, '1');
  res.setHeader('Retry-After', String(cooldown));
  res.status(429).json({
    success: false,
    message: `Too many verification code requests for this email. Wait ${Math.ceil(cooldown / 60)} minute(s), then try again.`,
    retryAfter: cooldown,
  });
  return false;
}

/** If stored OTP has a version, client must send the same otpVersion or verification fails (stale code after resend). */
export function isOtpVersionMismatch(
  stored: StoredLoginOtp | StoredSignupOtp,
  otpVersion: number | undefined
): boolean {
  if (stored.v == null) return false;
  if (otpVersion == null || !Number.isFinite(otpVersion)) return true;
  return otpVersion !== stored.v;
}
