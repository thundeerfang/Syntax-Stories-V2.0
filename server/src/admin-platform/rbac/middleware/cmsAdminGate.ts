import type { RequestHandler } from 'express';
import { verifyToken } from '../../../middlewares/auth/index.js';
import { env } from '../../../config/env.js';
import { staffManagementContext } from './staffManagementContext.js';
import { requireAdminPermission } from './requireAdminPermission.js';
import { requireStaff } from './requireStaff.middleware.js';

/**
 * CMS admin routes: RBAC permission when enabled, legacy staffRole gate otherwise.
 */
export function cmsAdminGate(
  permission: 'help:manage' | 'legal:manage' | 'trash:manage'
): RequestHandler[] {
  if (env.FEATURE_ADMIN_RBAC_ENABLED) {
    return [verifyToken, staffManagementContext, requireAdminPermission(permission)];
  }
  return [verifyToken, requireStaff('editor', 'admin')];
}
