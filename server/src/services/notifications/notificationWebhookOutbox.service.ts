import { getRedis } from "../../config/redis.js";
import { writeNotificationAudit } from "../../shared/audit/auditLog.js";
import { NotificationAuditAction } from "../../shared/audit/domains.js";
import { redisKeys } from "../../shared/redis/keys.js";
import type { NotificationWebhookOutboxMessage } from "./notification.types.js";
import { deliverNotificationWebhook } from "./notificationWebhook.service.js";
import { getActivePlatformWebhook } from "./platformNotificationConfig.service.js";
export type NotificationWebhookDeliveryItem = {
  id: string;
  type: NotificationWebhookOutboxMessage["payload"]["type"];
  title: string;
  message: string;
  href: string;
  icon: NotificationWebhookOutboxMessage["payload"]["icon"];
  time: string;
  metadata?: Record<string, unknown>;
};
export async function enqueueNotificationWebhookDelivery(
  userId: string,
  item: NotificationWebhookDeliveryItem,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    await writeNotificationAudit(NotificationAuditAction.WEBHOOK_SKIPPED, {
      userId,
      notificationId: item.id,
      metadata: { reason: "redis_unavailable" },
    });
    return;
  }
  const msg: NotificationWebhookOutboxMessage = {
    v: 1,
    kind: "webhook_delivery",
    userId,
    notificationId: item.id,
    payload: {
      id: item.id,
      type: item.type,
      title: item.title,
      message: item.message,
      href: item.href,
      icon: item.icon,
      time: item.time,
      userId,
      metadata: item.metadata,
    },
    ts: Date.now(),
  };
  try {
    await redis.lPush(redisKeys.notifications.outbox, JSON.stringify(msg));
  } catch (e) {
    console.warn("[notificationWebhookOutbox] enqueue failed:", String(e));
    await writeNotificationAudit(NotificationAuditAction.WEBHOOK_SKIPPED, {
      userId,
      notificationId: item.id,
      metadata: { reason: "redis_enqueue_failed", err: String(e) },
    });
  }
}
function parseOutboxMessage(
  raw: string,
): NotificationWebhookOutboxMessage | null {
  try {
    const parsed = JSON.parse(raw) as Partial<NotificationWebhookOutboxMessage>;
    if (parsed.v !== 1 || parsed.kind !== "webhook_delivery") return null;
    if (!parsed.userId || !parsed.notificationId || !parsed.payload?.id)
      return null;
    return parsed as NotificationWebhookOutboxMessage;
  } catch {
    return null;
  }
}
export async function processNotificationWebhookOutboxMessage(
  raw: string,
): Promise<void> {
  const message = parseOutboxMessage(raw);
  if (!message) {
    console.warn("[notification-webhook] skipped unrecognized outbox payload");
    return;
  }
  const wh = await getActivePlatformWebhook();
  if (!wh?.enabled || !wh.url) {
    await writeNotificationAudit(NotificationAuditAction.WEBHOOK_SKIPPED, {
      userId: message.userId,
      notificationId: message.notificationId,
      metadata: { reason: "platform_webhook_disabled" },
    });
    return;
  }
  await deliverNotificationWebhook({
    userId: message.userId,
    notificationId: message.notificationId,
    webhookUrl: wh.url,
    webhookSecret: wh.secret,
    payload: message.payload,
  });
}
