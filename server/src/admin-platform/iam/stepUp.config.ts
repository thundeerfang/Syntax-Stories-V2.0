/** Permissions that require a recent TOTP step-up (Phase 2). */
export const STEP_UP_REQUIRED_PERMISSIONS = new Set([
  'admin_role:manage',
  'admin_assignment:manage',
  'user:lock',
  'user:unlock',
  'user:revoke_sessions',
  'user:impersonate',
  'user:reset_email',
  'billing:sync_subscription',
  'billing:open_stripe_customer',
]);

export const STEP_UP_TTL_SEC = 15 * 60;

/** Staff admin UI idle window before 2FA confirmation is required again. */
export const ADMIN_IDLE_STEP_UP_SEC = 60 * 60;

/** Time allowed to complete 2FA after confirmation is required. */
export const ADMIN_STEP_UP_GRACE_SEC = 10 * 60;

export function permissionRequiresStepUp(permission: string): boolean {
  return STEP_UP_REQUIRED_PERMISSIONS.has(permission);
}
