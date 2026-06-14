import type { createClient } from "redis";
import { redisKeys } from "../shared/redis/keys.js";
import { processNotificationWebhookOutboxMessage } from "../services/notifications/notificationWebhookOutbox.service.js";
type RedisClient = Awaited<ReturnType<typeof createClient>>;
let consumerStarted = false;
export function startNotificationWebhookOutboxConsumer(
  client: RedisClient,
): void {
  if (consumerStarted) return;
  consumerStarted = true;
  void (async () => {
    console.log("[NotificationWebhook] Outbox consumer started");
    for (;;) {
      if (!client.isOpen) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      try {
        const result = await client.brPop(redisKeys.notifications.outbox, 0);
        const raw = result?.element;
        if (!raw) continue;
        await processNotificationWebhookOutboxMessage(raw);
      } catch (e) {
        console.warn("[notification-webhook] consumer loop error:", String(e));
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  })();
}
