/**
 * Taxonomy of `action` values stored via `writeAuditLog`.
 * Auth-related actions use an `auth.*` namespace; other domains keep stable snake_case names.
 */
export const AuditAction = {
  OTP_SENT: 'auth.email.otp_sent',
  OTP_FAILED: 'auth.email.otp_failed',
  OTP_VERIFIED: 'auth.email.otp_verified',
  SESSION_CREATED: 'auth.session.created',
  SESSION_REVOKED: 'auth.session.revoked',
  USER_SIGNIN: 'auth.user.signin',
  USER_SIGNOUT: 'auth.user.signout',
  USER_SIGNUP: 'auth.user.signup',
  TWOFa_ENABLED: 'auth.twofa.enabled',
  TWOFa_DISABLED: 'auth.twofa.disabled',
  PROFILE_UPDATED: 'profile_updated',
  PROFILE_VIEW: 'profile_view',
  FOLLOW: 'follow',
  UNFOLLOW: 'unfollow',
  OAUTH_CONNECTED: 'auth.oauth.connected',
  OAUTH_LOGIN: 'auth.oauth.login',
  OAUTH_DISCONNECTED: 'auth.oauth.disconnected',
  EMAIL_CHANGE: 'auth.email.change',
  ACCOUNT_LOCKED: 'auth.account.locked',
  ACCOUNT_DELETED: 'auth.account.deleted',
  /** Profile PATCH diff events (granular, same collection as other audit rows). */
  STACK_TOOL_ADDED: 'stack_tool_added',
  STACK_TOOL_REMOVED: 'stack_tool_removed',
  CERTIFICATION_ADDED: 'certification_added',
  CERTIFICATION_UPDATED: 'certification_updated',
  CERTIFICATION_REMOVED: 'certification_removed',
  PROJECT_ADDED: 'project_added',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_REMOVED: 'project_removed',
  OPEN_SOURCE_ADDED: 'open_source_added',
  OPEN_SOURCE_UPDATED: 'open_source_updated',
  OPEN_SOURCE_REMOVED: 'open_source_removed',
  MY_SETUP_ADDED: 'my_setup_added',
  MY_SETUP_UPDATED: 'my_setup_updated',
  MY_SETUP_REMOVED: 'my_setup_removed',
  ADMIN_BLOG_RESTORED: 'admin.blog.restored',
  ADMIN_BLOG_SOFT_DELETED: 'admin.blog.soft_deleted',
  ADMIN_BLOG_SUSPENDED: 'admin.blog.suspended',
  ADMIN_BLOG_UNSUSPENDED: 'admin.blog.unsuspended',
  ADMIN_USER_RESTORED: 'admin.user.restored',
  ADMIN_TRASH_LISTED: 'admin.trash.listed',
  ADMIN_OPERATOR_CREATED: 'admin.operator.created',
  ADMIN_OPERATOR_UPDATED: 'admin.operator.updated',
  ADMIN_ROLE_CREATED: 'admin.role.created',
  ADMIN_ROLE_UPDATED: 'admin.role.updated',
  ADMIN_ROLE_DELETED: 'admin.role.deleted',
  ADMIN_INVITE_OTP_SENT: 'admin.invite.otp_sent',
  ADMIN_INVITE_OTP_VERIFIED: 'admin.invite.otp_verified',
  ADMIN_STEP_UP_VERIFIED: 'admin.auth.step_up_verified',
  ADMIN_PASSKEY_REGISTERED: 'admin.auth.passkey_registered',
  ADMIN_PASSKEY_REMOVED: 'admin.auth.passkey_removed',
  ADMIN_IMPERSONATION_STARTED: 'admin.impersonation.started',
  ADMIN_IMPERSONATION_ENDED: 'admin.impersonation.ended',
  ADMIN_DEVICE_TRUSTED: 'admin.device.trusted',
  ADMIN_ELEVATION_GRANTED: 'admin.elevation.granted',
  ADMIN_ELEVATION_REVOKED: 'admin.elevation.revoked',
} as const;

export type AuditActionName = (typeof AuditAction)[keyof typeof AuditAction];

/** Example payload shapes per action (for documentation / future strict typing). */
export type AuditMetadataByAction = {
  [AuditAction.OTP_SENT]: { channel: 'email'; purpose: 'login' | 'signup'; email: string };
  [AuditAction.OTP_FAILED]: { email: string; reason: string };
  [AuditAction.OTP_VERIFIED]: { email: string; purpose: string };
  [AuditAction.SESSION_CREATED]: {
    sessionId: string;
    deviceName?: string;
    source?: string;
    expiresAt?: string;
  };
  [AuditAction.USER_SIGNIN]: { source: string };
  [AuditAction.OAUTH_LOGIN]: { provider: string };
  [AuditAction.OAUTH_CONNECTED]: { provider: string };
  [AuditAction.OAUTH_DISCONNECTED]: { provider: string };
  [AuditAction.EMAIL_CHANGE]: { newEmail: string };
  [AuditAction.PROFILE_UPDATED]: { keys: string[] };
  [AuditAction.PROFILE_VIEW]: Record<string, unknown>;
  [AuditAction.FOLLOW]: Record<string, unknown>;
  [AuditAction.UNFOLLOW]: Record<string, unknown>;
};
