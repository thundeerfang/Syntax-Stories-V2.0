import crypto from "node:crypto";
import { getRedis } from "../config/redis.js";
import { redisKeys } from "../shared/redis/keys.js";
import { OAUTH_EXCHANGE_TTL_SEC } from "../variable/constants.js";
export type OAuthExchangePayload = {
  accessToken: string;
  refreshToken: string;
  userId: string;
  idField: string;
  providerId: string;
};
export async function storeOAuthExchange(
  payload: OAuthExchangePayload,
): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  const code = crypto.randomBytes(32).toString("hex");
  await redis.setEx(
    redisKeys.oauth.exchange(code),
    OAUTH_EXCHANGE_TTL_SEC,
    JSON.stringify(payload),
  );
  return code;
}
export async function consumeOAuthExchange(
  code: string,
): Promise<OAuthExchangePayload | null> {
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
