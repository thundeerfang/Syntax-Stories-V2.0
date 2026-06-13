import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { normalizeProfileImg, type IUser } from '../models/User.js';
import { authConfig } from '../config/auth.config.js';
import { signAccessToken } from '../config/jwt.js';
import { createAuthChallenge } from '../utils/authChallenge.js';
import { writeAuditLog } from '../shared/audit/auditLog.js';
import { AuditAction } from '../shared/audit/events.js';
import { createSession, generateRefreshToken } from './session.service.js';
import { assertNewStaffDeviceAllowed } from '../admin-platform/iam/deviceBinding.service.js';
import { createStaffPermissionSnapshot } from '../admin-platform/iam/permissionSnapshot.service.js';
import { setAdminSessionCookies } from '../admin-platform/auth/adminSessionCookies.js';
import { resolveStaffRoleForUser } from '../admin-platform/rbac/services/adminStaffResolution.js';
import { env } from '../config/env.js';
import { emitAppEvent } from '../shared/events/appEvents.js';
import { REFERRAL_COOKIE } from './referral.service.js';

type EmailAuthOpts = {
  /** When set from staff password login, audit + app events use this source; 2FA is skipped. */
  loginSource?: 'otp' | 'staff_password';
  /** Merged into successful JSON response (e.g. twoFactorSetupRequired). */
  responseExtras?: Record<string, unknown>;
};

/**
 * After email OTP is verified: 2FA branch, or issue JWT + session JSON (same shape as verifyOtp).
 */
export async function respondWithSessionAfterEmailAuth(
  req: Request,
  res: Response,
  user: HydratedDocument<IUser>,
  isNewUser: boolean,
  opts?: EmailAuthOpts
): Promise<void> {
  const skipTwoFactor = opts?.loginSource === 'staff_password';
  if (user.twoFactorEnabled && !skipTwoFactor) {
    try {
      const { challengeToken, expiresIn } = await createAuthChallenge(String(user._id));
      if (isNewUser) {
        res.clearCookie(REFERRAL_COOKIE.name, { path: '/' });
      }
      res.status(200).json({
        success: true,
        twoFactorRequired: true,
        challengeToken,
        expiresIn,
        isNewUser,
        email: user.email ?? undefined,
        message: 'Two-factor authentication required.',
      });
      return;
    } catch {
      res.status(503).json({
        success: false,
        message: 'Two-factor authentication temporarily unavailable. Try again later.',
      });
      return;
    }
  }

  const refreshToken = generateRefreshToken();
  const session = await createSession(String(user._id), req, refreshToken);
  const sessionId = String(session._id);
  const accessToken = signAccessToken({ _id: String(user._id), sessionId });
  const staffRole = await resolveStaffRoleForUser(String(user._id));
  if (staffRole) {
    const deviceCheck = await assertNewStaffDeviceAllowed(String(user._id), req);
    if (!deviceCheck.ok) {
      session.revoked = true;
      await session.save();
      res.status(403).json({ success: false, message: deviceCheck.reason });
      return;
    }
    setAdminSessionCookies(res, { accessToken, refreshToken });
  }
  void createStaffPermissionSnapshot(String(user._id), sessionId);
  const auditSource = isNewUser
    ? 'signup_email'
    : opts?.loginSource === 'staff_password'
      ? 'staff_password'
      : 'otp';
  void writeAuditLog(req, AuditAction.SESSION_CREATED, {
    actorId: String(user._id),
    metadata: {
      sessionId: String(session._id),
      deviceName: session.deviceName,
      source: auditSource,
      expiresAt: session.expiresAt?.toISOString?.(),
    },
  });
  void writeAuditLog(req, AuditAction.USER_SIGNIN, {
    actorId: String(user._id),
    metadata: { source: auditSource },
  });
  emitAppEvent('auth.signin.success', {
    userId: String(user._id),
    source: auditSource,
    isNewUser,
  });

  if (isNewUser) {
    res.clearCookie(REFERRAL_COOKIE.name, { path: '/' });
  }

  const body: Record<string, unknown> = {
    message: 'Signed in successfully 🚀',
    success: true,
    expiresIn: authConfig.ACCESS_TOKEN_EXPIRY,
    sessionId: session._id,
    isNewUser,
    tokensInCookies: staffRole ? env.FEATURE_ADMIN_HTTPONLY_COOKIES : false,
    user: {
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      profileImg: normalizeProfileImg(user.profileImg),
    },
    ...(opts?.responseExtras ?? {}),
  };
  if (!staffRole || !env.FEATURE_ADMIN_HTTPONLY_COOKIES) {
    body.accessToken = accessToken;
    body.refreshToken = refreshToken;
  }
  res.status(200).json(body);
}
