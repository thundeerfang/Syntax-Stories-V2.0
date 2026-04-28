import crypto from 'node:crypto';
import type { Request } from 'express';
import { getRedis } from '../config/redis.js';
import { redisKeys } from '../shared/redis/keys.js';
import { normalizeReferralCode } from '../services/referral.service.js';

const OAUTH_SIGNUP_NONCE_TTL_SEC = 600;

/**
 * Build Passport `state` for OAuth signup. Optional `?ref=` stores code in Redis under nonce (fail-open).
 */
export async function buildOAuthSignupState(req: Request): Promise<'signup' | `signup:${string}`> {
  const refRaw = req.query?.ref;
  const refCode = normalizeReferralCode(typeof refRaw === 'string' ? refRaw : undefined);
  if (!refCode) return 'signup';
  const redis = getRedis();
  if (!redis) return 'signup';
  const nonce = crypto.randomBytes(16).toString('hex');
  try {
    await redis.setEx(redisKeys.invite.oauthSignupNonce(nonce), OAUTH_SIGNUP_NONCE_TTL_SEC, refCode);
  } catch {
    return 'signup';
  }
  return `signup:${nonce}`;
}
