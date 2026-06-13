import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuditLogModel } from '../../models/AuditLog.js';
import { NotificationModel } from '../../models/Notification.js';
import { NotificationAuditAction } from '../../shared/audit/domains.js';
import { sendAdminError, sendAdminOk } from '../rbac/adminResponse.js';
import {
  getPlatformNotificationConfig,
  patchPlatformNotificationConfig,
  type PlatformNotificationConfigAdmin,
} from '../../services/notifications/platformNotificationConfig.service.js';

const NOTIFICATION_DOMAIN_FILTER = { domain: 'notification' as const };

export async function getAdminNotificationConfig(_req: Request, res: Response): Promise<void> {
  const config = (await getPlatformNotificationConfig(true)) as PlatformNotificationConfigAdmin;
  sendAdminOk(res, { config });
}

export async function patchAdminNotificationConfig(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    webhookEnabled?: unknown;
    webhookUrl?: unknown;
    webhookSecret?: unknown;
  };
  const patch: {
    webhookEnabled?: boolean;
    webhookUrl?: string | null;
    webhookSecret?: string | null;
  } = {};
  if (typeof body.webhookEnabled === 'boolean') patch.webhookEnabled = body.webhookEnabled;
  if (body.webhookUrl === null || typeof body.webhookUrl === 'string') {
    patch.webhookUrl = body.webhookUrl;
  }
  if (body.webhookSecret === null || typeof body.webhookSecret === 'string') {
    patch.webhookSecret = body.webhookSecret;
  }
  const config = await patchPlatformNotificationConfig(patch);
  sendAdminOk(res, { config });
}

export async function getAdminNotificationStats(_req: Request, res: Response): Promise<void> {
  const [totalNotifications, unreadNotifications, auditRows, webhookSent, webhookFailed] =
    await Promise.all([
      NotificationModel.countDocuments(),
      NotificationModel.countDocuments({ readAt: null }),
      AuditLogModel.countDocuments(NOTIFICATION_DOMAIN_FILTER),
      AuditLogModel.countDocuments({
        ...NOTIFICATION_DOMAIN_FILTER,
        action: NotificationAuditAction.WEBHOOK_SENT,
      }),
      AuditLogModel.countDocuments({
        ...NOTIFICATION_DOMAIN_FILTER,
        action: NotificationAuditAction.WEBHOOK_FAILED,
      }),
    ]);
  sendAdminOk(res, {
    stats: {
      totalNotifications,
      unreadNotifications,
      auditRows,
      webhookSent,
      webhookFailed,
    },
  });
}

export async function listAdminNotificationAudit(req: Request, res: Response): Promise<void> {
  const limitRaw = req.query.limit;
  const limit =
    typeof limitRaw === 'string' && /^\d+$/.test(limitRaw)
      ? Math.min(Number.parseInt(limitRaw, 10), 200)
      : 50;
  const cursorRaw = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  const filter: Record<string, unknown> = { ...NOTIFICATION_DOMAIN_FILTER };
  if (cursorRaw && mongoose.Types.ObjectId.isValid(cursorRaw)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursorRaw) };
  }

  const rows = await AuditLogModel.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? String(slice[slice.length - 1]?._id ?? '') : null;

  sendAdminOk(res, {
    items: slice.map((r) => ({
      id: String(r._id),
      action: r.action,
      userId: r.actorId ? String(r.actorId) : null,
      notificationId: r.targetId ? String(r.targetId) : null,
      metadata: r.metadata ?? null,
      timestamp: r.timestamp?.toISOString?.() ?? null,
    })),
    nextCursor,
  });
}

export async function postAdminNotificationWebhookTest(_req: Request, res: Response): Promise<void> {
  const config = (await getPlatformNotificationConfig(true)) as PlatformNotificationConfigAdmin;
  if (!config.webhookEnabled || !config.webhookUrl.trim()) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Enable webhook delivery and set a URL first.');
    return;
  }
  const { deliverNotificationWebhook } = await import(
    '../../services/notifications/notificationWebhook.service.js'
  );
  await deliverNotificationWebhook({
    userId: 'platform-test',
    notificationId: new mongoose.Types.ObjectId().toHexString(),
    webhookUrl: config.webhookUrl.trim(),
    webhookSecret: config.webhookSecret?.trim() || undefined,
    payload: {
      id: 'test-notification',
      type: 'settings_update',
      title: 'Test webhook',
      message: 'Syntax Stories admin sent a test notification webhook.',
      href: '/settings?section=notifications',
      icon: 'bell',
      time: 'Just now',
      metadata: { test: true },
    },
  });
  sendAdminOk(res, {
    ok: true,
    message: 'Test webhook dispatched. Check delivery audit for result.',
  });
}
