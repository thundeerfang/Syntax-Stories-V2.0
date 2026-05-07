import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../../../middlewares/auth/index.js';
import { getEffectiveAdminPermissions } from '../services/rbac.service.js';
import { sendAdminError } from '../adminResponse.js';
import { resolveStaffRoleForUser } from '../services/adminStaffResolution.js';

export type StaffManagementRequest = Request & {
  user: AuthUser;
  staffRole?: 'editor' | 'admin';
  adminPermissions?: Set<string>;
};

/**
 * After `verifyToken`: loads `staffRole` from DB and attaches `adminPermissions` for RBAC routes.
 * Rejects non-staff users (no `staffRole`).
 */
export async function staffManagementContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = (req as StaffManagementRequest).user;
  if (!user?._id) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const staffRole = await resolveStaffRoleForUser(user._id);
  if (!staffRole) {
    sendAdminError(
      res,
      403,
      'FORBIDDEN',
      'Management API requires a staff or admin account.'
    );
    return;
  }

  (req as StaffManagementRequest).staffRole = staffRole;
  const perms = await getEffectiveAdminPermissions(user._id);
  (req as StaffManagementRequest).adminPermissions = perms;
  next();
}
