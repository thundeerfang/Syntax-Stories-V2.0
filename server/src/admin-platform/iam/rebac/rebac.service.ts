import type { StaffManagementRequest } from '../../rbac/middleware/staffManagementContext.js';

export type RebacResource = {
  type: 'user' | 'role' | 'billing';
  id: string;
};

/**
 * Relationship-aware checks (Phase 6 foundation).
 * Extends RBAC with resource-scoped rules (e.g. impersonation scope).
 */
export function rebacAllows(
  req: StaffManagementRequest,
  permission: string,
  resource?: RebacResource
): { allow: true } | { allow: false; message: string } {
  if (!resource) return { allow: true };

  const impersonation = req.impersonation;
  if (impersonation && resource.type === 'user') {
    if (resource.id !== impersonation.targetUserId) {
      return {
        allow: false,
        message: 'During impersonation you may only access the impersonated user.',
      };
    }
    const readOnly = new Set([
      'user:read',
      'user:list',
      'user:search',
      'billing:read_subscription',
      'billing:read_ledger',
      'billing:manage_plans',
      'blog:read_metrics',
      'blog:list',
      'blog:read',
      'blog_category:list',
      'blog_category:read',
      'blog_tag:list',
      'blog_tag:read',
    ]);
    if (!readOnly.has(permission)) {
      return {
        allow: false,
        message: 'Impersonation sessions are read-only for this resource.',
      };
    }
  }

  return { allow: true };
}
