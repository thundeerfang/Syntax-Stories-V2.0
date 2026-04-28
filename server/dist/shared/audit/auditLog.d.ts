import type { Request } from 'express';
import mongoose from 'mongoose';
export interface WriteAuditLogOptions {
    actorId?: string | mongoose.Types.ObjectId | null;
    targetType?: string;
    targetId?: string | mongoose.Types.ObjectId | null;
    metadata?: Record<string, unknown>;
}
/**
 * Write a single entry to the audit log. Safe to call from anywhere; logs and swallows errors.
 */
export declare function writeAuditLog(req: Request | null, action: string, options?: WriteAuditLogOptions): Promise<void>;
//# sourceMappingURL=auditLog.d.ts.map