import { ADMIN_PERMISSIONS } from '../rbac/adminPermissions.js';

export type SecurityZone = 'finance' | 'support' | 'infrastructure' | 'compliance' | 'root';

/** Maps each permission key to a security zone (Phase 4). */
export const PERMISSION_TO_ZONE: Record<string, SecurityZone> = {
  'user:list': 'support',
  'user:read': 'support',
  'user:search': 'support',
  'user:update_profile': 'support',
  'user:lock': 'support',
  'user:unlock': 'support',
  'user:reset_email': 'infrastructure',
  'user:read_oauth': 'support',
  'user:read_security': 'infrastructure',
  'user:revoke_sessions': 'infrastructure',
  'billing:read_subscription': 'finance',
  'billing:read_ledger': 'finance',
  'billing:open_stripe_customer': 'finance',
  'billing:sync_subscription': 'finance',
  'billing:manage_plans': 'finance',
  'blog:read_metrics': 'support',
  'blog:list': 'support',
  'blog:read': 'support',
  'blog_category:list': 'support',
  'blog_category:read': 'support',
  'blog_category:manage': 'support',
  'blog_tag:list': 'support',
  'blog_tag:read': 'support',
  'blog_tag:manage': 'support',
  'admin_role:manage': 'root',
  'admin_assignment:manage': 'root',
  'audit:read': 'compliance',
  'feedback:read': 'support',
  'feedback:manage': 'support',
  'contact_lead:read': 'support',
  'help:manage': 'support',
  'legal:manage': 'compliance',
  'trash:manage': 'infrastructure',
  'notification:read': 'root',
  'notification:manage': 'root',
};

for (const p of ADMIN_PERMISSIONS) {
  if (!PERMISSION_TO_ZONE[p]) {
    PERMISSION_TO_ZONE[p] = 'support';
  }
}

export function zoneForPermission(permission: string): SecurityZone | undefined {
  return PERMISSION_TO_ZONE[permission];
}

export function securityZonesForPermissions(permissions: Iterable<string>): SecurityZone[] {
  const set = new Set<SecurityZone>();
  for (const p of permissions) {
    const z = zoneForPermission(p);
    if (z) set.add(z);
  }
  return [...set];
}

export function actorHasZone(permissions: Set<string>, zone: SecurityZone): boolean {
  for (const p of permissions) {
    if (zoneForPermission(p) === zone) return true;
  }
  return false;
}
