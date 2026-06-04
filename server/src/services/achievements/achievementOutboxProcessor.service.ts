import { AchievementOutboxEventModel } from '../../models/AchievementOutboxEvent.js';
import { isRedisAvailable } from '../../config/redis.js';
import { publishAchievementStreamMessage } from './achievementStream.service.js';

let processorStarted = false;

/** Poll pending outbox rows and publish to Redis stream (Phase 2 outbox processor). */
export async function startAchievementOutboxProcessor(): Promise<void> {
  if (processorStarted || !isRedisAvailable()) return;
  processorStarted = true;

  void (async () => {
    for (;;) {
      try {
        const pending = await AchievementOutboxEventModel.find({
          status: 'pending',
          attempts: { $lt: 8 },
        })
          .sort({ createdAt: 1 })
          .limit(20)
          .lean();

        for (const row of pending) {
          const payload = row.payload as {
            userId: string;
            events: import('../../achievements/achievement.types.js').AchievementEvent[];
            ctx?: import('./dispatchAchievementEvents.js').AchievementDispatchContext;
          };
          try {
            await publishAchievementStreamMessage({
              outboxId: String(row._id),
              userId: payload.userId,
              events: payload.events,
              ctx: payload.ctx,
            });
            await AchievementOutboxEventModel.updateOne(
              { _id: row._id },
              { $set: { status: 'published' } }
            );
          } catch (e) {
            await AchievementOutboxEventModel.updateOne(
              { _id: row._id },
              {
                $inc: { attempts: 1 },
                $set: { lastError: e instanceof Error ? e.message : String(e) },
              }
            );
          }
        }
      } catch (e) {
        console.warn('[achievement-outbox]', String(e));
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  })();

  console.log('[Achievements] Outbox processor started');
}
