import type { Request, Response, NextFunction } from 'express';
import { env } from '../../../config/env.js';
import { sendAdminError } from '../adminResponse.js';
import type { StaffManagementRequest } from './staffManagementContext.js';

/**
 * Enforces a single permission key when FEATURE_ADMIN_RBAC_ENABLED is true.
 * When false, staffManagementContext already granted full catalog — this passes.
 */
export function requireAdminPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!env.FEATURE_ADMIN_RBAC_ENABLED) {
      next();
      return;
    }
    const r = req as StaffManagementRequest;
    const set = r.adminPermissions;
    const uid = r.user?._id;
    if (!set?.has(permission)) {
      console.warn('[admin] PERMISSION_DENIED', {
        actorId: uid,
        route: `${req.method} ${req.originalUrl}`,
        requiredPermission: permission,
        t: new Date().toISOString(),
      });
      sendAdminError(res, 403, 'PERMISSION_DENIED', 'You do not have access to this action.');
      return;
    }
    next();
  };
}
