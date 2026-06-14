import {
  createRedisSubscriberClient,
  isRedisAvailable,
} from "../../config/redis.js";
import { redisKeys } from "../../shared/redis/keys.js";
import type { AchievementEvent } from "../../achievements/achievement.types.js";
import { GamificationOutboxEventModel } from "../../models/GamificationOutboxEvent.js";
import { AchievementOutboxEventModel } from "../../models/AchievementOutboxEvent.js";
import { processAchievementEvents } from "../achievements/achievementEngine.service.js";
import type { GamificationStreamMessage } from "./gamificationStream.service.js";
import { markGamificationOutboxPublished } from "./gamificationOutbox.service.js";
import { processReferralAttribution } from "./referralProcessor.service.js";
let workerStarted = false;
async function handleGamificationMessage(
  message: GamificationStreamMessage,
): Promise<void> {
  if (message.kind === "achievement") {
    const events = message.events as AchievementEvent[];
    if (message.userId && events?.length) {
      await processAchievementEvents(message.userId, events, {
        sourceEvent: events.map((e) => e.type).join(","),
      });
    }
    return;
  }
  if (message.kind === "referral" && message.conversionId) {
    await processReferralAttribution(message.conversionId);
  }
}
async function markOutboxPublished(outboxId?: string): Promise<void> {
  if (!outboxId) return;
  await markGamificationOutboxPublished(outboxId);
  await AchievementOutboxEventModel.updateOne(
    { _id: outboxId, status: "pending" },
    { $set: { status: "published" } },
  ).catch(() => undefined);
}
export async function startGamificationWorker(): Promise<void> {
  if (workerStarted || !isRedisAvailable()) return;
  const sub = await createRedisSubscriberClient();
  if (!sub) {
    console.warn(
      "[Gamification] Stream worker skipped — Redis subscriber unavailable",
    );
    return;
  }
  workerStarted = true;
  const group = "gamification-workers";
  const consumer = `node-${process.pid}`;
  const streamKey = redisKeys.streams.gamification;
  try {
    await sub.xGroupCreate(streamKey, group, "0", { MKSTREAM: true });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    if (!msg.includes("BUSYGROUP")) {
      console.warn("[Gamification] xGroupCreate failed:", msg);
      workerStarted = false;
      try {
        await sub.quit();
      } catch {}
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
          { key: streamKey, id: ">" },
          {
            COUNT: 10,
            BLOCK: 500,
          },
        );
        if (!rows) continue;
        for (const stream of rows) {
          for (const msg of stream.messages) {
            try {
              const raw = msg.message.payload;
              if (!raw) {
                await sub.xAck(streamKey, group, msg.id);
                continue;
              }
              const parsed = JSON.parse(raw) as GamificationStreamMessage;
              await handleGamificationMessage(parsed);
              await markOutboxPublished(parsed.outboxId);
            } catch (e) {
              console.warn("[gamification-worker] message failed:", String(e));
            }
            try {
              await sub.xAck(streamKey, group, msg.id);
            } catch {}
          }
        }
      } catch (e) {
        console.warn("[gamification-worker] loop error:", String(e));
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  })();
  console.log("[Gamification] Stream worker started");
}
export async function startGamificationOutboxProcessor(): Promise<void> {
  const tick = async () => {
    try {
      const pending = await GamificationOutboxEventModel.find({
        status: "pending",
        attempts: { $lt: 8 },
      })
        .sort({ createdAt: 1 })
        .limit(20)
        .lean();
      for (const row of pending) {
        try {
          if (row.type === "referral.process_attribution") {
            const conversionId = (
              row.payload as {
                conversionId?: string;
              }
            ).conversionId;
            if (conversionId) await processReferralAttribution(conversionId);
          } else if (row.type === "achievement.events") {
            const payload = row.payload as {
              userId?: string;
              events?: AchievementEvent[];
            };
            if (payload.userId && payload.events?.length) {
              await processAchievementEvents(payload.userId, payload.events, {
                sourceEvent: payload.events.map((e) => e.type).join(","),
              });
            }
          }
          await GamificationOutboxEventModel.updateOne(
            { _id: row._id },
            { $set: { status: "published" } },
          );
        } catch (e) {
          await GamificationOutboxEventModel.updateOne(
            { _id: row._id },
            {
              $inc: { attempts: 1 },
              $set: { lastError: e instanceof Error ? e.message : String(e) },
            },
          );
        }
      }
    } catch (e) {
      console.warn("[gamification-outbox]", String(e));
    }
  };
  void tick();
  setInterval(() => void tick(), 10000);
}
