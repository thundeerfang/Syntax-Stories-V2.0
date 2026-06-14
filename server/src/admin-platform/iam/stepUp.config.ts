export const STEP_UP_REQUIRED_PERMISSIONS = new Set([
  "admin_role:manage",
  "admin_assignment:manage",
  "user:lock",
  "user:unlock",
  "user:revoke_sessions",
  "user:impersonate",
  "user:reset_email",
  "billing:sync_subscription",
  "billing:open_stripe_customer",
]);
export {
  ADMIN_IDLE_STEP_UP_SEC,
  ADMIN_STEP_UP_GRACE_SEC,
  STEP_UP_TTL_SEC,
} from "../../variable/constants.js";
export function permissionRequiresStepUp(permission: string): boolean {
  return STEP_UP_REQUIRED_PERMISSIONS.has(permission);
}
