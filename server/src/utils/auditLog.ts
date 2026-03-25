import type { Request } from 'express';
import mongoose from 'mongoose';
import { AuditLogModel } from '../models/AuditLog';

function getClientMeta(req: Request | null): { ip?: string; userAgent?: string } {
  if (!req) return {};
  const ip =
    req.ip ??
    (req.connection as { remoteAddress?: string })?.remoteAddress ??
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
    undefined;
  const userAgent = req.get('User-Agent') ?? undefined;
  return { ip, userAgent };
}

export interface WriteAuditLogOptions {
  actorId?: string | mongoose.Types.ObjectId | null;
  targetType?: string;
  targetId?: string | mongoose.Types.ObjectId | null;
  metadata?: Record<string, unknown>;
}

/**
 * Write a single entry to the audit log. Safe to call from anywhere; logs and swallows errors.
 */
export async function writeAuditLog(
  req: Request | null,
  action: string,
  options: WriteAuditLogOptions = {}
): Promise<void> {
  const { actorId, targetType, targetId, metadata } = options;
  const { ip, userAgent } = getClientMeta(req);
  try {
    await AuditLogModel.create({
      action,
      actorId: actorId != null ? (typeof actorId === 'string' ? new mongoose.Types.ObjectId(actorId) : actorId) : undefined,
      targetType: targetType ?? undefined,
      targetId: targetId != null ? (typeof targetId === 'string' ? new mongoose.Types.ObjectId(targetId) : targetId) : undefined,
      metadata: metadata ?? {},
      ip,
      userAgent,
    });
  } catch (e) {
    console.error('[AuditLog] write failed:', e);
  }
}
