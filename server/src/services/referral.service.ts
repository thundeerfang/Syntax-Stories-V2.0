import crypto from 'node:crypto';
import type { Request } from 'express';
import mongoose, { type HydratedDocument } from 'mongoose';
import { env } from '../config/env.js';
import { getRedis } from '../config/redis.js';
import { UserModel, normalizeProfileImg, type IUser } from '../models/User.js';
import { redisKeys } from '../shared/redis/keys.js';
import { emitAppEvent } from '../shared/events/appEvents.js';

const REFERRAL_CODE_REGEX = /^[0-9A-HJKMNP-TV-Z]{8,16}$/;
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const NEGATIVE_CACHE_SENTINEL = '__NONE__';
const COOKIE_NAME = 'ss_ref';
const COOKIE_MAX_MS = 30 * 24 * 60 * 60 * 1000;
const POSITIVE_CACHE_TTL_SEC = 24 * 60 * 60;
const NEGATIVE_CACHE_TTL_SEC = 600;

function referralSigningSecret(): string {
  return env.REFERRAL_SIGNING_SECRET || '';
}

function generateReferralCodeChars(length: number): string {
  const bytes = crypto.randomBytes(length);
  let s = '';
  for (let i = 0; i < length; i++) {
    s += CROCKFORD[bytes[i]! % 32];
  }
  return s;
}

/** Normalize and validate referral codes before any DB access. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  if (!code || code.length < 8 || code.length > 16) return null;
  if (!REFERRAL_CODE_REGEX.test(code)) return null;
  return code;
}

function signReferralCookiePayload(code: string): string | null {
  const secret = referralSigningSecret();
  if (!secret) return null;
  const exp = Date.now() + COOKIE_MAX_MS;
  const payload = JSON.stringify({ c: code, exp });
  const b64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function readSignedReferralCookie(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.includes('.')) return null;
  const secret = referralSigningSecret();
  if (!secret) return null;
  const i = raw.lastIndexOf('.');
  const b64 = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expected = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  let parsed: { c?: string; exp?: number };
  try {
    parsed = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as { c?: string; exp?: number };
  } catch {
    return null;
  }
  if (typeof parsed.c !== 'string' || typeof parsed.exp !== 'number') return null;
  if (parsed.exp < Date.now()) return null;
  return normalizeReferralCode(parsed.c);
}

export function parseSignupOAuthNonceFromState(state: unknown): string | null {
  if (typeof state !== 'string' || !state.startsWith('signup:')) return null;
  const nonce = state.slice(7);
  if (!/^[a-f0-9]{32}$/.test(nonce)) return null;
  return nonce;
}

async function readOAuthReferralFromReq(req: Request): Promise<string | null> {
  const nonce = parseSignupOAuthNonceFromState(req.query?.state);
  if (!nonce) return null;
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(redisKeys.invite.oauthSignupNonce(nonce));
    return normalizeReferralCode(raw);
  } catch (err) {
    console.warn(JSON.stringify({ event: 'referral_redis_degraded', err: String(err) }));
    return null;
  }
}

/**
 * Single resolver: body → signed cookie → OAuth signup nonce (Redis).
 * Fail-open on Redis (§3.1).
 */
export async function resolveReferralInput(req: Request): Promise<string | null> {
  const fromBody = normalizeReferralCode((req.body as { referralCode?: unknown })?.referralCode);
  if (fromBody) return fromBody;

  let fromCookie: string | null = null;
  try {
    fromCookie = readSignedReferralCookie(req.cookies?.[COOKIE_NAME]);
  } catch {
    fromCookie = null;
  }
  if (fromCookie) return fromCookie;

  try {
    const fromOAuth = await readOAuthReferralFromReq(req);
    if (fromOAuth) return fromOAuth;
  } catch (err) {
    console.warn(JSON.stringify({ event: 'referral_redis_degraded', err: String(err) }));
  }

  return null;
}

export type ReferralDisplayDto = {
  valid: true;
  username: string;
  fullName: string;
  profileImg: string;
};

export async function resolveCodeForDisplay(code: string): Promise<ReferralDisplayDto | { valid: false }> {
  const norm = normalizeReferralCode(code);
  if (!norm) return { valid: false };
  const referrerId = await lookupReferrerIdByCode(norm);
  if (!referrerId) return { valid: false };
  const u = await UserModel.findById(referrerId).select('username fullName profileImg').lean();
  if (!u?.username) return { valid: false };
  return {
    valid: true,
    username: u.username,
    fullName: u.fullName ?? u.username,
    profileImg: normalizeProfileImg(u.profileImg),
  };
}

export async function lookupReferrerIdByCode(code: string): Promise<string | null> {
  const norm = normalizeReferralCode(code);
  if (!norm) return null;
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(redisKeys.invite.codeCache(norm));
      if (cached === NEGATIVE_CACHE_SENTINEL) return null;
      if (cached && mongoose.isValidObjectId(cached)) return cached;
    } catch (err) {
      console.warn(JSON.stringify({ event: 'referral_redis_degraded', err: String(err) }));
    }
  }

  const user = await UserModel.findOne({ referralCode: norm }).select('_id').lean();
  const id = user?._id ? String(user._id) : null;

  if (redis && id) {
    try {
      await redis.setEx(redisKeys.invite.codeCache(norm), POSITIVE_CACHE_TTL_SEC, id);
    } catch {
      /* ignore */
    }
  } else if (redis && !id) {
    try {
      await redis.setEx(redisKeys.invite.codeCache(norm), NEGATIVE_CACHE_TTL_SEC, NEGATIVE_CACHE_SENTINEL);
    } catch {
      /* ignore */
    }
  }

  return id;
}

/** IMPORTANT: invalidate Redis cache on referralCode change (regenerate / admin fix). */
export async function invalidateReferralCodeCache(normalizedCode: string): Promise<void> {
  const norm = normalizeReferralCode(normalizedCode);
  if (!norm) return;
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(redisKeys.invite.codeCache(norm));
  } catch {
    /* ignore */
  }
}

export async function ensureReferralCodeForUser(userId: string): Promise<string> {
  const existing = await UserModel.findById(userId).select('referralCode').lean();
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateReferralCodeChars(10);
    try {
      const updated = await UserModel.findOneAndUpdate(
        { _id: userId, $or: [{ referralCode: { $exists: false } }, { referralCode: null }, { referralCode: '' }] },
        { $set: { referralCode: code } },
        { new: true, select: 'referralCode' }
      ).lean();
      if (updated?.referralCode) return updated.referralCode;
    } catch (e) {
      const dup = (e as { code?: number }).code === 11000;
      if (!dup) throw e;
    }
  }
  const u = await UserModel.findById(userId).select('referralCode').lean();
  if (u?.referralCode) return u.referralCode;
  throw new Error('Could not allocate referral code');
}

export type ApplyReferralArgs = {
  req: Request;
  newUser: HydratedDocument<IUser>;
  refCode: string | null;
  source?: string;
};

export async function applyReferralOnNewUser(args: ApplyReferralArgs): Promise<void> {
  if (!env.REFERRALS_ENABLED) return;

  const { newUser, refCode, source } = args;
  const rc = refCode;
  if (rc == null || typeof rc !== 'string' || !rc.trim()) return;

  const referrerIdStr = await lookupReferrerIdByCode(rc);
  if (!referrerIdStr || !mongoose.isValidObjectId(referrerIdStr)) {
    console.warn(JSON.stringify({ event: 'referral_invalid', refCode: rc.slice(0, 16) }));
    return;
  }

  const referrerId = new mongoose.Types.ObjectId(referrerIdStr);
  if (referrerId.equals(newUser._id as mongoose.Types.ObjectId)) {
    return;
  }

  console.info(
    JSON.stringify({
      event: 'referral_attempt',
      refCode: rc.slice(0, 16),
      newUserId: String(newUser._id),
      source: source ?? 'unknown',
    })
  );

  const now = new Date();
  const res = await UserModel.updateOne(
    { _id: newUser._id, referredByUserId: null },
    {
      $set: {
        referredByUserId: referrerId,
        referredAt: now,
        referralCapturedAt: now,
        ...(source ? { referralSource: source.slice(0, 32) } : {}),
      },
    }
  );

  if (res.modifiedCount === 0) {
    return;
  }

  newUser.set('referredByUserId', referrerId);
  newUser.set('referredAt', now);
  if (source) newUser.set('referralSource', source.slice(0, 32));
  newUser.set('referralCapturedAt', now);

  console.info(
    JSON.stringify({
      event: 'referral_applied',
      referrerId: referrerIdStr,
      newUserId: String(newUser._id),
    })
  );

  emitAppEvent('referral.converted', {
    referrerId: referrerIdStr,
    refereeUserId: String(newUser._id),
    source: source ?? 'unknown',
  });
}

export const REFERRAL_COOKIE = { name: COOKIE_NAME, maxMs: COOKIE_MAX_MS } as const;

export function buildSignedReferralCookieValue(code: string): string | null {
  return signReferralCookiePayload(code);
}
