import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';
import type { AchievementEvent } from '../../achievements/achievement.types.js';
import type { AchievementDispatchContext } from '../achievements/dispatchAchievementEvents.js';

const STREAM_MAX_LEN = 100_000;

export type GamificationStreamKind = 'achievement' | 'referral';

export type GamificationStreamMessage =
  | {
      kind: 'achievement';
      outboxId?: string;
      userId: string;
      events: AchievementEvent[];
      ctx?: AchievementDispatchContext;
    }
  | {
      kind: 'referral';
      outboxId?: string;
      conversionId: string;
      action: 'process_attribution';
    };

export async function publishGamificationStreamMessage(
  message: GamificationStreamMessage
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const streamKey = redisKeys.streams.gamification;
  await redis.xAdd(
    streamKey,
    '*',
    {
      payload: JSON.stringify(message),
      kind: message.kind,
      at: new Date().toISOString(),
    },
    { TRIM: { strategy: 'MAXLEN', strategyModifier: '~', threshold: STREAM_MAX_LEN } }
  );
}

/** Back-compat: achievement-only publish still writes to gamification stream. */
export async function publishAchievementToGamificationStream(message: {
  outboxId?: string;
  userId: string;
  events: AchievementEvent[];
  ctx?: AchievementDispatchContext;
}): Promise<void> {
  await publishGamificationStreamMessage({ kind: 'achievement', ...message });
}
