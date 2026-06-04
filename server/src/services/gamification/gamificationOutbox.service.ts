import { env } from '../../config/env.js';
import { isRedisAvailable } from '../../config/redis.js';
import { GamificationOutboxEventModel } from '../../models/GamificationOutboxEvent.js';
import type { AchievementEvent } from '../../achievements/achievement.types.js';
import type { AchievementDispatchContext } from '../achievements/dispatchAchievementEvents.js';
import {
  publishAchievementToGamificationStream,
  publishGamificationStreamMessage,
} from './gamificationStream.service.js';
import { processReferralAttribution } from './referralProcessor.service.js';

export async function enqueueAchievementGamificationOutbox(
  userId: string,
  events: AchievementEvent[],
  ctx?: AchievementDispatchContext
): Promise<void> {
  const doc = await GamificationOutboxEventModel.create({
    aggregateId: userId,
    type: 'achievement.events',
    payload: { userId, events, ctx },
    status: 'pending',
  });

  if (isRedisAvailable()) {
    try {
      await publishAchievementToGamificationStream({
        outboxId: String(doc._id),
        userId,
        events,
        ctx,
      });
      doc.status = 'published';
      await doc.save();
    } catch (e) {
      doc.attempts = (doc.attempts ?? 0) + 1;
      doc.lastError = e instanceof Error ? e.message : String(e);
      await doc.save();
    }
  }
}

export async function enqueueReferralGamificationOutbox(conversionId: string): Promise<void> {
  const doc = await GamificationOutboxEventModel.create({
    aggregateId: conversionId,
    type: 'referral.process_attribution',
    payload: { conversionId },
    status: 'pending',
  });

  const useAsync = env.REFERRAL_ASYNC && isRedisAvailable();
  if (useAsync) {
    try {
      await publishGamificationStreamMessage({
        kind: 'referral',
        outboxId: String(doc._id),
        conversionId,
        action: 'process_attribution',
      });
      doc.status = 'published';
      await doc.save();
    } catch (e) {
      doc.attempts = (doc.attempts ?? 0) + 1;
      doc.lastError = e instanceof Error ? e.message : String(e);
      await doc.save();
      await processReferralAttribution(conversionId);
      doc.status = 'published';
      await doc.save();
    }
  } else {
    await processReferralAttribution(conversionId);
    doc.status = 'published';
    await doc.save();
  }
}

export async function markGamificationOutboxPublished(outboxId: string): Promise<void> {
  await GamificationOutboxEventModel.updateOne(
    { _id: outboxId, status: 'pending' },
    { $set: { status: 'published' } }
  ).catch(() => undefined);
}
