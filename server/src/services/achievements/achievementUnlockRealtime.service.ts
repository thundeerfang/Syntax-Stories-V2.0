import type { AchievementUnlockDto } from '../../achievements/achievement.types.js';
import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';
import { enqueueAchievementUnlockOutbox } from './achievementUnlockOutbox.service.js';

export type AchievementUnlockStreamPayload = {
  v: 1;
  type: 'achievement_unlock';
  userId: string;
  unlocks: AchievementUnlockDto[];
  ts: number;
};

function dialogUnlocks(unlocks: AchievementUnlockDto[]): AchievementUnlockDto[] {
  return unlocks.filter((u) => u.celebrateAs === 'dialog');
}

/** Immediate Redis Pub/Sub fan-out for achievement unlock dialogs (SSE on API). */
export async function publishAchievementUnlockRealtime(
  userId: string,
  unlocks: AchievementUnlockDto[]
): Promise<void> {
  const dialog = dialogUnlocks(unlocks);
  if (!userId || dialog.length === 0) return;

  const payload: AchievementUnlockStreamPayload = {
    v: 1,
    type: 'achievement_unlock',
    userId,
    unlocks: dialog,
    ts: Date.now(),
  };

  const redis = getRedis();
  if (!redis) {
    await enqueueAchievementUnlockOutbox(payload);
    return;
  }

  const msg = JSON.stringify(payload);
  try {
    await redis.publish(redisKeys.achievements.userChannel(userId), msg);
  } catch (e) {
    console.warn('[achievementUnlockRealtime] publish failed:', String(e));
    await enqueueAchievementUnlockOutbox(payload);
  }
}
