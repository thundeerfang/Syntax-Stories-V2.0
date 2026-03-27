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
  EDUCATION_ADDED: 'education_added',
  EDUCATION_UPDATED: 'education_updated',
  EDUCATION_REMOVED: 'education_removed',
  WORK_ADDED: 'work_added',
  WORK_UPDATED: 'work_updated',
  WORK_REMOVED: 'work_removed',
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
