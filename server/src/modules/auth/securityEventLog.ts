import type { Request } from 'express';
import { SecurityEventModel } from '../../models/SecurityEvent.js';

function getClientMeta(req: Request): { ip: string; userAgent: string } {
  const ip =
    req.ip ??
    req.socket?.remoteAddress ??
    req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
    'unknown';
  const userAgent = req.get('User-Agent') ?? '';
  return { ip, userAgent };
}

export async function logSecurityEvent(
  userId: string | null,
  type: string,
  req: Request,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { ip, userAgent } = getClientMeta(req);
  try {
    const doc: Record<string, unknown> = { type, ip, userAgent, metadata };
    if (userId) doc.userId = userId;
    await SecurityEventModel.create(doc);
  } catch (e) {
    console.error('SecurityEvent log failed:', e);
  }
}
