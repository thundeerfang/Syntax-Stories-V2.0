import type { Request } from 'express';
import type { ClientSession } from 'mongoose';
import mongoose from 'mongoose';
import { AuditLogModel } from '../../models/AuditLog.js';
import { appendAuditStream } from '../../admin-platform/iam/auditStream.service.js';
import {
  billingAuditAction,
  achievementEventAction,
  type AuditDomain,
  type NotificationAuditActionName,
} from './domains.js';

function toObjectId(id: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}

function objectIdField(
  id: string | mongoose.Types.ObjectId | null | undefined
): mongoose.Types.ObjectId | undefined {
  if (id == null) return undefined;
  return toObjectId(id);
}

function getClientMeta(req: Request | null): { ip?: string; userAgent?: string } {
  if (!req) return {};
  const ip =
    req.ip ??
    req.socket?.remoteAddress ??
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
    undefined;
  const userAgent = req.get('User-Agent') ?? undefined;
  return { ip, userAgent };
}

export interface WriteAuditLogOptions {
  /** Defaults to `core` for auth/admin/profile events. */
  domain?: AuditDomain;
  actorId?: string | mongoose.Types.ObjectId | null;
  targetType?: string;
  targetId?: string | mongoose.Types.ObjectId | null;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
  /** When set, audit row is written in the same Mongo transaction (billing). */
  session?: ClientSession | null;
  /** Skip Redis stream append (e.g. bulk migration replay). */
  skipStream?: boolean;
}

async function insertAuditRow(
  row: {
    domain: AuditDomain;
    action: string;
    actorId?: mongoose.Types.ObjectId;
    targetType?: string;
    targetId?: mongoose.Types.ObjectId;
    metadata: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
    timestamp: Date;
  },
  session?: ClientSession | null
): Promise<void> {
  const opts = session ? { session } : undefined;
  await AuditLogModel.create([row], opts);
}

/**
 * Write a single entry to the consolidated audit log. Safe to call from anywhere; logs and swallows errors.
 */
export async function writeAuditLog(
  req: Request | null,
  action: string,
  options: WriteAuditLogOptions = {}
): Promise<void> {
  const {
    domain = 'core',
    actorId,
    targetType,
    targetId,
    metadata,
    timestamp,
    session,
    skipStream,
  } = options;
  const { ip, userAgent } = getClientMeta(req);
  const at = (timestamp ?? new Date()).toISOString();
  const actorIdStr = actorId != null ? String(actorId) : undefined;
  const targetIdStr = targetId != null ? String(targetId) : undefined;
  const traceId =
    req?.headers['x-trace-id']?.toString() ?? req?.headers['x-request-id']?.toString();

  if (!skipStream) {
    void appendAuditStream({
      action,
      actorId: actorIdStr,
      targetType,
      targetId: targetIdStr,
      metadata: { ...metadata, domain },
      ip,
      userAgent,
      traceId,
      at,
    });
  }

  try {
    await insertAuditRow(
      {
        domain,
        action,
        actorId: objectIdField(actorId),
        targetType: targetType ?? undefined,
        targetId: objectIdField(targetId),
        metadata: metadata ?? {},
        ip,
        userAgent,
        timestamp: timestamp ?? new Date(),
      },
      session
    );
  } catch (e) {
    console.error('[AuditLog] write failed:', e);
  }
}

/** Notification delivery / realtime audit rows (`domain: notification`). */
export async function writeNotificationAudit(
  action: NotificationAuditActionName,
  params: {
    userId?: string;
    notificationId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await writeAuditLog(null, action, {
      domain: 'notification',
      actorId: params.userId,
      targetType: params.notificationId ? 'notification' : undefined,
      targetId: params.notificationId,
      metadata: params.metadata,
    });
  } catch (e) {
    console.warn('[notificationAudit]', action, String(e));
  }
}

/** Billing subscription projection audit (`domain: billing`). Supports Mongo sessions. */
export async function writeBillingAudit(
  params: {
    userId: mongoose.Types.ObjectId;
    action: string;
    source: string;
    stripeSubscriptionId?: string;
    stripeInvoiceId?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  },
  session?: ClientSession | null
): Promise<void> {
  try {
    await writeAuditLog(null, billingAuditAction(params.action), {
      domain: 'billing',
      actorId: params.userId,
      targetType: 'subscription',
      metadata: {
        source: params.source,
        stripeSubscriptionId: params.stripeSubscriptionId,
        stripeInvoiceId: params.stripeInvoiceId,
        before: params.before,
        after: params.after,
      },
      session,
    });
  } catch (e) {
    console.warn('[billingAudit]', params.action, String(e));
  }
}

/** Achievement engine audit (`domain: achievement`). */
export async function writeAchievementAudit(params: {
  userId: mongoose.Types.ObjectId;
  action: 'unlocked' | 'progress_updated' | 'revoked' | 'validation_blocked';
  achievementId?: string;
  sourceEvent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await writeAuditLog(null, `achievement.${params.action}`, {
      domain: 'achievement',
      actorId: params.userId,
      targetType: params.achievementId ? 'achievement' : undefined,
      metadata: {
        achievementId: params.achievementId,
        sourceEvent: params.sourceEvent,
        ...params.metadata,
      },
    });
  } catch (e) {
    console.warn('[achievementAudit]', params.action, String(e));
  }
}

export type AchievementEventLogContext = {
  source?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
};

/** Batch log incoming achievement triggers (`domain: achievement`, action `achievement.event.*`). */
export async function writeAchievementEventLogs(
  userId: string,
  eventTypes: string[],
  ctx?: AchievementEventLogContext
): Promise<void> {
  if (eventTypes.length === 0) return;
  try {
    const actorId = new mongoose.Types.ObjectId(userId);
    await AuditLogModel.insertMany(
      eventTypes.map((eventType) => ({
        domain: 'achievement' as const,
        action: achievementEventAction(eventType),
        actorId,
        metadata: {
          ingest: true,
          eventType,
          source: ctx?.source,
          sessionId: ctx?.sessionId,
        },
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
        timestamp: new Date(),
      })),
      { ordered: false }
    );
  } catch (e) {
    console.warn('[achievementEventLog]', String(e));
  }
}
