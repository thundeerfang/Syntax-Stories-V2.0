import type { Request } from 'express';
import mongoose from 'mongoose';
import { AuditLogModel } from '../../models/AuditLog.js';

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
      actorId: objectIdField(actorId),
      targetType: targetType ?? undefined,
      targetId: objectIdField(targetId),
      metadata: metadata ?? {},
      ip,
      userAgent,
    });
  } catch (e) {
    console.error('[AuditLog] write failed:', e);
  }
}
