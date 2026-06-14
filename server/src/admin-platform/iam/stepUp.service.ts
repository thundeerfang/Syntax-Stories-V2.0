import { getRedis } from "../../config/redis.js";
import { redisKeys } from "../../shared/redis/keys.js";
import { STEP_UP_TTL_SEC } from "./stepUp.config.js";
export async function markStepUpVerified(
  sessionId: string,
  userId: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.setEx(
    redisKeys.iam.stepUp(sessionId),
    STEP_UP_TTL_SEC,
    JSON.stringify({ userId, verifiedAt: Date.now() }),
  );
}
export async function hasValidStepUp(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const raw = await redis.get(redisKeys.iam.stepUp(sessionId));
  if (!raw) return false;
  try {
    const payload = JSON.parse(raw) as {
      userId: string;
    };
    return payload.userId === userId;
  } catch {
    return false;
  }
}
export async function clearStepUp(sessionId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(redisKeys.iam.stepUp(sessionId));
}
