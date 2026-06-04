/**
 * Permission dependency rules — prevents dangerous role misconfiguration (Phase 5).
 */
const REQUIRES: Record<string, string[]> = {
  'admin_assignment:manage': ['admin_role:manage'],
  'billing:sync_subscription': ['billing:read_subscription'],
  'billing:open_stripe_customer': ['billing:read_subscription'],
  'user:lock': ['user:read'],
  'user:unlock': ['user:read'],
  'user:revoke_sessions': ['user:read'],
  'user:reset_email': ['user:read'],
  'user:impersonate': ['user:read'],
};

export function validatePermissionDependencies(permissions: string[]): string[] {
  const set = new Set(permissions);
  const errors: string[] = [];
  for (const p of permissions) {
    const deps = REQUIRES[p];
    if (!deps) continue;
    for (const dep of deps) {
      if (!set.has(dep)) {
        errors.push(`"${p}" requires "${dep}"`);
      }
    }
  }
  return errors;
}
