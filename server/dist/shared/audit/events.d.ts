/**
 * Taxonomy of `action` values stored via `writeAuditLog`.
 * Auth-related actions use an `auth.*` namespace; other domains keep stable snake_case names.
 */
export declare const AuditAction: {
    readonly OTP_SENT: "auth.email.otp_sent";
    readonly OTP_FAILED: "auth.email.otp_failed";
    readonly OTP_VERIFIED: "auth.email.otp_verified";
    readonly SESSION_CREATED: "auth.session.created";
    readonly SESSION_REVOKED: "auth.session.revoked";
    readonly USER_SIGNIN: "auth.user.signin";
    readonly USER_SIGNOUT: "auth.user.signout";
    readonly USER_SIGNUP: "auth.user.signup";
    readonly TWOFa_ENABLED: "auth.twofa.enabled";
    readonly TWOFa_DISABLED: "auth.twofa.disabled";
    readonly PROFILE_UPDATED: "profile_updated";
    readonly PROFILE_VIEW: "profile_view";
    readonly FOLLOW: "follow";
    readonly UNFOLLOW: "unfollow";
    readonly OAUTH_CONNECTED: "auth.oauth.connected";
    readonly OAUTH_LOGIN: "auth.oauth.login";
    readonly OAUTH_DISCONNECTED: "auth.oauth.disconnected";
    readonly EMAIL_CHANGE: "auth.email.change";
    readonly ACCOUNT_LOCKED: "auth.account.locked";
    readonly ACCOUNT_DELETED: "auth.account.deleted";
    /** Profile PATCH diff events (granular, same collection as other audit rows). */
    readonly STACK_TOOL_ADDED: "stack_tool_added";
    readonly STACK_TOOL_REMOVED: "stack_tool_removed";
    readonly EDUCATION_ADDED: "education_added";
    readonly EDUCATION_UPDATED: "education_updated";
    readonly EDUCATION_REMOVED: "education_removed";
    readonly WORK_ADDED: "work_added";
    readonly WORK_UPDATED: "work_updated";
    readonly WORK_REMOVED: "work_removed";
    readonly CERTIFICATION_ADDED: "certification_added";
    readonly CERTIFICATION_UPDATED: "certification_updated";
    readonly CERTIFICATION_REMOVED: "certification_removed";
    readonly PROJECT_ADDED: "project_added";
    readonly PROJECT_UPDATED: "project_updated";
    readonly PROJECT_REMOVED: "project_removed";
    readonly OPEN_SOURCE_ADDED: "open_source_added";
    readonly OPEN_SOURCE_UPDATED: "open_source_updated";
    readonly OPEN_SOURCE_REMOVED: "open_source_removed";
    readonly MY_SETUP_ADDED: "my_setup_added";
    readonly MY_SETUP_UPDATED: "my_setup_updated";
    readonly MY_SETUP_REMOVED: "my_setup_removed";
};
export type AuditActionName = (typeof AuditAction)[keyof typeof AuditAction];
/** Example payload shapes per action (for documentation / future strict typing). */
export type AuditMetadataByAction = {
    [AuditAction.OTP_SENT]: {
        channel: 'email';
        purpose: 'login' | 'signup';
        email: string;
    };
    [AuditAction.OTP_FAILED]: {
        email: string;
        reason: string;
    };
    [AuditAction.OTP_VERIFIED]: {
        email: string;
        purpose: string;
    };
    [AuditAction.SESSION_CREATED]: {
        sessionId: string;
        deviceName?: string;
        source?: string;
        expiresAt?: string;
    };
    [AuditAction.USER_SIGNIN]: {
        source: string;
    };
    [AuditAction.OAUTH_LOGIN]: {
        provider: string;
    };
    [AuditAction.OAUTH_CONNECTED]: {
        provider: string;
    };
    [AuditAction.OAUTH_DISCONNECTED]: {
        provider: string;
    };
    [AuditAction.EMAIL_CHANGE]: {
        newEmail: string;
    };
    [AuditAction.PROFILE_UPDATED]: {
        keys: string[];
    };
    [AuditAction.PROFILE_VIEW]: Record<string, unknown>;
    [AuditAction.FOLLOW]: Record<string, unknown>;
    [AuditAction.UNFOLLOW]: Record<string, unknown>;
};
//# sourceMappingURL=events.d.ts.map