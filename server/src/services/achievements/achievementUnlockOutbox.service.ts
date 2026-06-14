import {
  createRedisSubscriberClient,
  getRedis,
  isRedisAvailable,
} from "../../config/redis.js";
import { redisKeys } from "../../shared/redis/keys.js";
import type { AchievementUnlockStreamPayload } from "./achievementUnlockRealtime.service.js";
let consumerStarted = false;
export async function enqueueAchievementUnlockOutbox(
  payload: AchievementUnlockStreamPayload,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.lPush(
      redisKeys.achievements.unlockOutbox,
      JSON.stringify(payload),
    );
  } catch (e) {
    console.warn("[achievementUnlockOutbox] enqueue failed:", String(e));
  }
}
function parseOutboxMessage(
  raw: string,
): AchievementUnlockStreamPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AchievementUnlockStreamPayload>;
    if (parsed.v !== 1 || parsed.type !== "achievement_unlock") return null;
    if (
      !parsed.userId ||
      !Array.isArray(parsed.unlocks) ||
      parsed.unlocks.length === 0
    ) {
      return null;
    }
    return parsed as AchievementUnlockStreamPayload;
  } catch {
    return null;
  }
}
async function deliverOutboxPayload(
  payload: AchievementUnlockStreamPayload,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.publish(
    redisKeys.achievements.userChannel(payload.userId),
    JSON.stringify(payload),
  );
}
export async function processAchievementUnlockOutboxMessage(
  raw: string,
): Promise<void> {
  const payload = parseOutboxMessage(raw);
  if (!payload) return;
  await deliverOutboxPayload(payload);
}
export async function startAchievementUnlockOutboxConsumer(): Promise<void> {
  if (consumerStarted || !isRedisAvailable()) return;
  const client = await createRedisSubscriberClient();
  if (!client) {
    console.warn(
      "[Achievements] Unlock outbox consumer skipped — Redis unavailable",
    );
    return;
  }
  consumerStarted = true;
  void (async () => {
    for (;;) {
      if (!client.isOpen) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      try {
        const result = await client.brPop(
          redisKeys.achievements.unlockOutbox,
          2,
        );
        const raw = result?.element;
        if (raw) await processAchievementUnlockOutboxMessage(raw);
      } catch (e) {
        console.warn("[achievementUnlockOutbox] consumer error:", String(e));
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  })();
  console.log("[Achievements] Unlock outbox consumer started");
}
