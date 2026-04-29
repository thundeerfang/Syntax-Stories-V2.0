import mongoose, { Document, Model } from 'mongoose';
export declare const SECURITY_EVENT_TYPES: readonly ["login_success", "login_failure", "logout", "session_created", "session_revoked", "provider_disconnect", "twofa_enabled", "twofa_disabled", "account_locked", "account_unlocked", "oauth_login", "password_change", "password_reset_request", "password_reset_success"];
export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];
export interface ISecurityEvent extends Document {
    userId?: mongoose.Types.ObjectId;
    type: SecurityEventType;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}
export declare const SecurityEventModel: Model<ISecurityEvent>;
//# sourceMappingURL=SecurityEvent.d.ts.map