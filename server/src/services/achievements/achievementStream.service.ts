import { getRedis } from "../../config/redis.js";
import { redisKeys } from "../../shared/redis/keys.js";
import type { AchievementEvent } from "../../achievements/achievement.types.js";
import type { AchievementDispatchContext } from "./dispatchAchievementEvents.js";
const STREAM_MAX_LEN = 100000;
export type AchievementStreamMessage = {
  outboxId?: string;
  userId: string;
  events: AchievementEvent[];
  ctx?: AchievementDispatchContext;
};
export async function publishAchievementStreamMessage(
  message: AchievementStreamMessage,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.xAdd(
    redisKeys.streams.achievements,
    "*",
    {
      payload: JSON.stringify(message),
      userId: message.userId,
      at: new Date().toISOString(),
    },
    {
      TRIM: {
        strategy: "MAXLEN",
        strategyModifier: "~",
        threshold: STREAM_MAX_LEN,
      },
    },
  );
}
