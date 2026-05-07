import crypto from 'node:crypto';
import { getRedis } from '../config/redis.js';
import { redisKeys } from '../shared/redis/keys.js';

/** Short-lived: user must open callback and POST exchange quickly. */
const EXCHANGE_TTL_SEC = 90;

export type OAuthExchangePayload = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  /** User document field name (e.g. googleId) for client parity with legacy redirects. */
  idField: string;
  providerId: string;
};

/**
 * Store tokens server-side; returns opaque code for redirect query (Week 3).
 * Returns `null` when Redis is unavailable — caller should fall back to legacy URL tokens.
 */
export async function storeOAuthExchange(payload: OAuthExchangePayload): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const code = crypto.randomBytes(32).toString('hex');
  await redis.setEx(redisKeys.oauth.exchange(code), EXCHANGE_TTL_SEC, JSON.stringify(payload));
  return code;
}

/** Single-use: deletes key after successful read. */
export async function consumeOAuthExchange(code: string): Promise<OAuthExchangePayload | null> {
  const trimmed = code?.trim();
  if (!trimmed || trimmed.length > 128) return null;
  const redis = getRedis();
  if (!redis) return null;
  const key = redisKeys.oauth.exchange(trimmed);
  const raw = await redis.get(key);
  if (!raw) return null;
  await redis.del(key);
  try {
    return JSON.parse(raw) as OAuthExchangePayload;
  } catch {
    return null;
  }
}
