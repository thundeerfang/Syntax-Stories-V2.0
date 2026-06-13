import type { Request, Response, NextFunction } from 'express';
import type { AuthUser } from '../../../middlewares/auth/index.js';
import { getEffectiveAdminPermissions, getPermissionVersion } from '../services/rbac.service.js';
import { sendAdminError } from '../adminResponse.js';
import { resolveStaffRoleForUser } from '../services/adminStaffResolution.js';
import { getStaffPermissionSnapshot } from '../../iam/permissionSnapshot.service.js';
import { getImpersonation } from '../../iam/impersonation.service.js';
import type { CompiledPermissionGraph } from '../../iam/permissionCompiler.service.js';
import type { ImpersonationState } from '../../iam/impersonation.service.js';

export type StaffManagementRequest = Request & {
  user: AuthUser;
  staffRole?: 'editor' | 'admin';
  adminPermissions?: Set<string>;
  compiledPermissionGraph?: CompiledPermissionGraph;
  impersonation?: ImpersonationState | null;
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
    sendAdminError(res, 403, 'FORBIDDEN', 'Management API requires a staff or admin account.');
    return;
  }

  (req as StaffManagementRequest).staffRole = staffRole;

  let perms: Set<string> | undefined;
  if (user.sessionId) {
    const snapshot = await getStaffPermissionSnapshot(user.sessionId);
    const currentVersion = await getPermissionVersion(user._id);
    if (snapshot && snapshot.permVersion === currentVersion) {
      perms = new Set(snapshot.permissions);
      if (snapshot.compiledGraph) {
        (req as StaffManagementRequest).compiledPermissionGraph = snapshot.compiledGraph;
      }
    }
  }
  if (!perms) {
    perms = await getEffectiveAdminPermissions(user._id);
  }

  const mgmtReq = req as StaffManagementRequest;
  mgmtReq.adminPermissions = perms;
  if (user.sessionId) {
    mgmtReq.impersonation = await getImpersonation(user.sessionId);
  }
  next();
}
