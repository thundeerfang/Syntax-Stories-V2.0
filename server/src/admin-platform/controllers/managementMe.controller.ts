import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { UserModel } from '../../models/User.js';
import type { StaffManagementRequest } from '../rbac/middleware/staffManagementContext.js';
import { getPermissionVersion } from '../rbac/services/rbac.service.js';
import { getStaffPermissionSnapshot } from '../iam/permissionSnapshot.service.js';
import { securityZonesForPermissions } from '../iam/securityZones.config.js';
import { getImpersonation } from '../iam/impersonation.service.js';
import { getAdminSessionIdleStatus } from '../iam/adminSessionIdle.service.js';
import { SessionModel } from '../../models/Session.js';
import { sendAdminOk } from '../rbac/adminResponse.js';

/**
 * GET /api/v1/admin/management/me
 * Staff profile + effective RBAC for admin UI nav gating.
 */
export async function getManagementMe(req: Request, res: Response): Promise<void> {
  const mgmt = req as StaffManagementRequest;
  const userId = mgmt.user._id;
  const sessionId = mgmt.user.sessionId;

  const user = await UserModel.findById(userId)
    .select(
      'fullName username email staffRole twoFactorEnabled +twoFactorSecret passkeys passkeyStepUpEnabled'
    )
    .lean();

  if (!user) {
    res
      .status(404)
      .json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    return;
  }

  const permissions = [...(mgmt.adminPermissions ?? [])].sort();
  const permVersion = await getPermissionVersion(userId);

  let roleName: string | null = null;
  let securityZones: string[] = securityZonesForPermissions(permissions);
  if (sessionId) {
    const snapshot = await getStaffPermissionSnapshot(sessionId);
    if (snapshot?.roleName) roleName = snapshot.roleName;
    if (snapshot?.securityZones?.length) securityZones = snapshot.securityZones;
  }

  let sessionTier: string | null = null;
  if (sessionId) {
    const sess = await SessionModel.findById(sessionId).select('sessionTier').lean();
    sessionTier = sess?.sessionTier ?? null;
  }
  const impersonation = sessionId ? await getImpersonation(sessionId) : null;

  const sessionIdle =
    sessionId && user.twoFactorEnabled
      ? await getAdminSessionIdleStatus(sessionId, String(user._id))
      : null;

  sendAdminOk(res, {
    user: {
      _id: String(user._id),
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      staffRole: mgmt.staffRole ?? user.staffRole ?? null,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      twoFactorSetupRequired: Boolean(user.twoFactorEnabled && !user.twoFactorSecret),
      passkeyStepUpEnabled: Boolean(user.passkeyStepUpEnabled && (user.passkeys?.length ?? 0) > 0),
      passkeyRegistered: (user.passkeys?.length ?? 0) > 0,
    },
    roleName,
    permissions,
    securityZones,
    sessionTier,
    impersonation: impersonation
      ? {
          targetUserId: impersonation.targetUserId,
          targetUsername: impersonation.targetUsername,
          targetEmail: impersonation.targetEmail,
          expiresAt: new Date(impersonation.expiresAt).toISOString(),
        }
      : null,
    httpOnlyCookies: env.FEATURE_ADMIN_HTTPONLY_COOKIES,
    deviceBindingEnabled: env.FEATURE_ADMIN_DEVICE_BINDING,
    riskEngineEnabled: env.FEATURE_ADMIN_RISK_ENGINE,
    temporalPermissionsEnabled: env.FEATURE_ADMIN_TEMPORAL_PERMISSIONS,
    rebacEnabled: env.FEATURE_ADMIN_REBAC,
    passkeyStepUpFeature: env.FEATURE_ADMIN_PASSKEY_STEPUP,
    sessionIdle,
    permVersion,
    permHash:
      sessionId && permissions.length > 0
        ? ((await getStaffPermissionSnapshot(sessionId))?.permHash ?? null)
        : null,
  });
}
