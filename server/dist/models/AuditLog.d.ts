import mongoose, { Document, Model } from 'mongoose';
export declare const AUDIT_ACTIONS: readonly ["user_signup", "user_signin", "user_signout", "session_created", "session_revoked", "login_failure", "email_change", "oauth_login", "oauth_connected", "oauth_disconnected", "twofa_enabled", "twofa_disabled", "OTP_SENT", "OTP_FAILED", "OTP_VERIFIED", "auth.email.otp_sent", "auth.email.otp_failed", "auth.email.otp_verified", "auth.session.created", "auth.session.revoked", "auth.user.signin", "auth.user.signout", "auth.user.signup", "auth.oauth.login", "auth.oauth.connected", "auth.oauth.disconnected", "auth.twofa.enabled", "auth.twofa.disabled", "auth.email.change", "auth.account.locked", "auth.account.deleted", "follow", "unfollow", "profile_updated", "profile_view", "education_added", "education_updated", "education_removed", "work_added", "work_updated", "work_removed", "project_added", "project_updated", "project_removed", "certification_added", "certification_updated", "certification_removed", "open_source_added", "open_source_updated", "open_source_removed", "stack_tool_added", "stack_tool_removed", "stack_tools_updated", "my_setup_added", "my_setup_updated", "my_setup_removed", "account_locked", "account_deleted"];
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export interface IAuditLog extends Document {
    action: string;
    actorId?: mongoose.Types.ObjectId;
    targetType?: string;
    targetId?: mongoose.Types.ObjectId;
    metadata?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
    timestamp: Date;
}
export declare const AuditLogModel: Model<IAuditLog>;
//# sourceMappingURL=AuditLog.d.ts.map