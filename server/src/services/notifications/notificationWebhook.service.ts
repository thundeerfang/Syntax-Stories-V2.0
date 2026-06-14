import { writeNotificationAudit } from "../../shared/audit/auditLog.js";
import { NotificationAuditAction } from "../../shared/audit/domains.js";
export async function deliverNotificationWebhook(params: {
  userId: string;
  notificationId: string;
  webhookUrl: string;
  webhookSecret?: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const { userId, notificationId, webhookUrl, webhookSecret, payload } = params;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "SyntaxStories-Notifications/1.0",
    "X-Notification-Id": notificationId,
  };
  if (webhookSecret) {
    headers["X-Webhook-Secret"] = webhookSecret;
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: "notification.created",
        notification: payload,
        ts: Date.now(),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    await writeNotificationAudit(NotificationAuditAction.WEBHOOK_SENT, {
      userId,
      notificationId,
      metadata: { status: res.status, webhookUrl: webhookUrl.slice(0, 120) },
    });
  } catch (e) {
    await writeNotificationAudit(NotificationAuditAction.WEBHOOK_FAILED, {
      userId,
      notificationId,
      metadata: { err: String(e), webhookUrl: webhookUrl.slice(0, 120) },
    });
  }
}
