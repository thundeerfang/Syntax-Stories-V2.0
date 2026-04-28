import mongoose from 'mongoose';
import { AuditLogModel } from '../../models/AuditLog.js';
function toObjectId(id) {
    return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
}
function objectIdField(id) {
    if (id == null)
        return undefined;
    return toObjectId(id);
}
function getClientMeta(req) {
    if (!req)
        return {};
    const ip = req.ip ??
        req.socket?.remoteAddress ??
        req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
        undefined;
    const userAgent = req.get('User-Agent') ?? undefined;
    return { ip, userAgent };
}
/**
 * Write a single entry to the audit log. Safe to call from anywhere; logs and swallows errors.
 */
export async function writeAuditLog(req, action, options = {}) {
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
    }
    catch (e) {
        console.error('[AuditLog] write failed:', e);
    }
}
//# sourceMappingURL=auditLog.js.map