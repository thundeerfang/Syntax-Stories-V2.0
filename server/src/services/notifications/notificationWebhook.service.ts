import mongoose from 'mongoose';
import { NotificationAuditLogModel } from '../../models/NotificationAuditLog.js';

export async function deliverNotificationWebhook(params: {
  userId: string;
  notificationId: string;
  webhookUrl: string;
  webhookSecret?: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const { userId, notificationId, webhookUrl, webhookSecret, payload } = params;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'SyntaxStories-Notifications/1.0',
    'X-Notification-Id': notificationId,
  };
  if (webhookSecret) {
    headers['X-Webhook-Secret'] = webhookSecret;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event: 'notification.created',
        notification: payload,
        ts: Date.now(),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    await NotificationAuditLogModel.create({
      action: 'notification.webhook.sent',
      userId: mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : undefined,
      notificationId: new mongoose.Types.ObjectId(notificationId),
      metadata: { status: res.status, webhookUrl: webhookUrl.slice(0, 120) },
    });
  } catch (e) {
    await NotificationAuditLogModel.create({
      action: 'notification.webhook.failed',
      userId: mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : undefined,
      notificationId: mongoose.Types.ObjectId.isValid(notificationId)
        ? new mongoose.Types.ObjectId(notificationId)
        : undefined,
      metadata: { err: String(e), webhookUrl: webhookUrl.slice(0, 120) },
    });
  }
}
