/**
 * Stable permission keys for platform admin (management API).
 * v1: roles store `permissions: string[]` — union resolves effective set.
 */
export const ADMIN_PERMISSIONS = [
  'user:list',
  'user:read',
  'user:search',
  'user:update_profile',
  'user:lock',
  'user:unlock',
  'user:reset_email',
  'user:read_oauth',
  'user:read_security',
  'user:revoke_sessions',
  'user:impersonate',
  'billing:read_subscription',
  'billing:read_ledger',
  'billing:open_stripe_customer',
  'billing:sync_subscription',
  'billing:manage_plans',
  'blog:read_metrics',
  'blog:list',
  'blog:read',
  'blog_category:list',
  'blog_category:read',
  'blog_category:manage',
  'blog_tag:list',
  'blog_tag:read',
  'blog_tag:manage',
  'admin_role:manage',
  'admin_assignment:manage',
  'audit:read',
  'feedback:read',
  'feedback:manage',
  'contact_lead:read',
  'legal:manage',
  'trash:manage',
  'achievement:list',
  'achievement:manage',
  'notification:read',
  'notification:manage',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ALL_ADMIN_PERMISSIONS: ReadonlySet<string> = new Set(ADMIN_PERMISSIONS);

export function isAdminPermission(p: string): p is AdminPermission {
  return ALL_ADMIN_PERMISSIONS.has(p);
}
