import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { normalizeProfileImg, type IUser } from '../models/User';
import { authConfig } from '../config/auth.config';
import { signAccessToken } from '../config/jwt';
import { createAuthChallenge } from '../utils/authChallenge';
import { writeAuditLog } from '../shared/audit/auditLog';
import { AuditAction } from '../shared/audit/events';
import { createSession, generateRefreshToken } from './session.service';
import { emitAppEvent } from '../shared/events/appEvents';

/**
 * After email OTP is verified: 2FA branch, or issue JWT + session JSON (same shape as verifyOtp).
 */
export async function respondWithSessionAfterEmailAuth(
  req: Request,
  res: Response,
  user: HydratedDocument<IUser>,
  isNewUser: boolean
): Promise<void> {
  if (user.twoFactorEnabled) {
    try {
      const { challengeToken, expiresIn } = await createAuthChallenge(String(user._id));
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
  const accessToken = signAccessToken({ _id: String(user._id), sessionId: String(session._id) });
  const auditSource = isNewUser ? 'signup_email' : 'otp';
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

  res.status(200).json({
    message: 'Signed in successfully 🚀',
    success: true,
    accessToken,
    refreshToken,
    expiresIn: authConfig.ACCESS_TOKEN_EXPIRY,
    sessionId: session._id,
    isNewUser,
    user: {
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      profileImg: normalizeProfileImg(user.profileImg),
    },
  });
}
