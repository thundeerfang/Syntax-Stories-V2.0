"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
const mongoose_1 = __importDefault(require("mongoose"));
const AuditLog_1 = require("../models/AuditLog");
function getClientMeta(req) {
    if (!req)
        return {};
    const ip = req.ip ??
        req.connection?.remoteAddress ??
        req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
        undefined;
    const userAgent = req.get('User-Agent') ?? undefined;
    return { ip, userAgent };
}
/**
 * Write a single entry to the audit log. Safe to call from anywhere; logs and swallows errors.
 */
async function writeAuditLog(req, action, options = {}) {
    const { actorId, targetType, targetId, metadata } = options;
    const { ip, userAgent } = getClientMeta(req);
    try {
        await AuditLog_1.AuditLogModel.create({
            action,
            actorId: actorId != null ? (typeof actorId === 'string' ? new mongoose_1.default.Types.ObjectId(actorId) : actorId) : undefined,
            targetType: targetType ?? undefined,
            targetId: targetId != null ? (typeof targetId === 'string' ? new mongoose_1.default.Types.ObjectId(targetId) : targetId) : undefined,
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