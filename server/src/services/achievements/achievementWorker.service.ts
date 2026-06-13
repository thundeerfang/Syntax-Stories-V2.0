import { createRedisSubscriberClient, isRedisAvailable } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';
import type { AchievementEvent } from '../../achievements/achievement.types.js';
import { AchievementOutboxEventModel } from '../../models/AchievementOutboxEvent.js';
import { processAchievementEvents } from './achievementEngine.service.js';
import type { AchievementStreamMessage } from './achievementStream.service.js';

let workerStarted = false;

export async function startAchievementWorker(): Promise<void> {
  if (workerStarted || !isRedisAvailable()) return;

  const sub = await createRedisSubscriberClient();
  if (!sub) {
    console.warn('[Achievements] Stream worker skipped — Redis subscriber unavailable');
    return;
  }

  workerStarted = true;

  const group = 'achievement-workers';
  const consumer = `node-${process.pid}`;

  try {
    await sub.xGroupCreate(redisKeys.streams.achievements, group, '0', { MKSTREAM: true });
  } catch (e) {
    const msg = (e as Error).message ?? '';
    if (!msg.includes('BUSYGROUP')) {
      console.warn('[Achievements] Stream worker xGroupCreate failed:', msg);
      workerStarted = false;
      try {
        await sub.quit();
      } catch {
        /* ignore */
      }
      return;
    }
  }

  void (async () => {
    for (;;) {
      if (!sub.isOpen) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      try {
        const rows = await sub.xReadGroup(
          group,
          consumer,
          { key: redisKeys.streams.achievements, id: '>' },
          { COUNT: 5, BLOCK: 5000 }
        );

        if (!rows) continue;

        for (const stream of rows) {
          for (const msg of stream.messages) {
            try {
              const raw = msg.message.payload;
              if (!raw) {
                await sub.xAck(redisKeys.streams.achievements, group, msg.id);
                continue;
              }
              const parsed = JSON.parse(raw) as AchievementStreamMessage;
              const events = parsed.events as AchievementEvent[];
              if (parsed.userId && events?.length) {
                await processAchievementEvents(parsed.userId, events, {
                  sourceEvent: events.map((e) => e.type).join(','),
                });
              }
              if (parsed.outboxId) {
                await AchievementOutboxEventModel.updateOne(
                  { _id: parsed.outboxId, status: 'pending' },
                  { $set: { status: 'published' } }
                ).catch(() => undefined);
              }
            } catch (e) {
              console.warn('[achievement-worker] message failed:', String(e));
            }
            try {
              await sub.xAck(redisKeys.streams.achievements, group, msg.id);
            } catch {
              /* ignore ack failure */
            }
          }
        }
      } catch (e) {
        console.warn('[achievement-worker] loop error:', String(e));
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  })();

  console.log('[Achievements] Stream worker started');
}
