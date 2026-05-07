import type { Request, Response, NextFunction } from 'express';
import { env } from '../../../config/env.js';
import { sendAdminError } from '../adminResponse.js';
import type { StaffManagementRequest } from './staffManagementContext.js';

export function requireAnyAdminPermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!env.FEATURE_ADMIN_RBAC_ENABLED) {
      next();
      return;
    }
    const r = req as StaffManagementRequest;
    const set = r.adminPermissions;
    const uid = r.user?._id;
    if (!permissions.some((p) => set?.has(p))) {
      console.warn('[admin] PERMISSION_DENIED', {
        actorId: uid,
        route: `${req.method} ${req.originalUrl}`,
        requiredPermission: permissions.join('|'),
        t: new Date().toISOString(),
      });
      sendAdminError(res, 403, 'PERMISSION_DENIED', 'You do not have access to this action.');
      return;
    }
    next();
  };
}
