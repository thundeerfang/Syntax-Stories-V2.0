import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../../../middlewares/auth/index.js';
import { resolveStaffRoleForUser, type StaffRole } from '../services/adminStaffResolution.js';

export type { StaffRole };

/**
 * After verifyToken: only users with staffRole editor or admin may access CMS routes.
 */
export function requireStaff(...allowed: StaffRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const role = await resolveStaffRoleForUser(user._id);
    if (!role || !allowed.includes(role)) {
      res.status(403).json({
        success: false,
        message: 'CMS access denied. Ask an admin to grant dashboard access.',
      });
      return;
    }
    (req as Request & { staffRole: StaffRole }).staffRole = role;
    next();
  };
}

export function isAdminRequest(req: Request): boolean {
  return (req as Request & { staffRole?: StaffRole }).staffRole === 'admin';
}
