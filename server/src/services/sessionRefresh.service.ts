import crypto from "node:crypto";
import type { Request, Response } from "express";
import { UserModel } from "../models/User.js";
import { SessionModel } from "../models/Session.js";
import { authConfig } from "../config/auth.config.js";
import { signAccessToken } from "../config/jwt.js";
import { logSecurityEvent } from "../modules/auth/securityEventLog.js";
import {
  generateRefreshToken,
  SESSION_DURATION_MS,
  hashToken,
} from "./session.service.js";
import { refreshStaffPermissionSnapshot } from "../admin-platform/iam/permissionSnapshot.service.js";
import { incrementIamMetric } from "../admin-platform/iam/iamMetrics.service.js";
import { setAdminSessionCookies } from "../admin-platform/auth/adminSessionCookies.js";
import { verifyDeviceBindingOnRefresh } from "../admin-platform/iam/deviceBinding.service.js";
import { resolveStaffRoleForUser } from "../admin-platform/rbac/services/adminStaffResolution.js";
import { env } from "../config/env.js";
function hashRefreshToken(token: string): string {
  return hashToken(token);
}
export async function revokeSessionFamily(
  sessionFamilyId: string,
  reason: string,
): Promise<void> {
  await SessionModel.updateMany(
    { sessionFamilyId, revoked: false },
    { $set: { revoked: true, revokedReason: reason } },
  );
}
export type RefreshSessionResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
      expiresIn: string;
      sessionId: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };
export async function refreshSessionWithRotation(
  req: Request,
  refreshTokenRaw: string,
): Promise<RefreshSessionResult> {
  const incomingHash = hashRefreshToken(refreshTokenRaw);
  let session = await SessionModel.findOne({
    refreshTokenHash: incomingHash,
    revoked: false,
    expiresAt: { $gt: new Date() },
  });
  if (!session) {
    const reuseVictim = await SessionModel.findOne({
      previousRefreshTokenHash: incomingHash,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });
    if (reuseVictim) {
      const graceMs = env.REFRESH_REUSE_GRACE_MS;
      const rotatedAt = reuseVictim.lastActiveAt?.getTime() ?? 0;
      const withinGrace = graceMs > 0 && Date.now() - rotatedAt <= graceMs;
      if (withinGrace) {
        session = reuseVictim;
      } else if (reuseVictim.sessionFamilyId) {
        await revokeSessionFamily(
          reuseVictim.sessionFamilyId,
          "refresh_token_reuse",
        );
        await logSecurityEvent(
          String(reuseVictim.userId),
          "refresh_token_reuse",
          req,
          {
            sessionFamilyId: reuseVictim.sessionFamilyId,
          },
        );
        void incrementIamMetric("refresh_token_reuse");
      }
    }
    if (!session) {
      void incrementIamMetric("refresh_failure");
      return {
        ok: false,
        status: 401,
        message: "Session invalid or expired. Please log in again.",
      };
    }
  }
  const user = await UserModel.findById(session.userId).select(
    "isActive staffRole",
  );
  if (!user || !user.isActive) {
    return { ok: false, status: 401, message: "Account disabled or not found" };
  }
  const staffRole = await resolveStaffRoleForUser(String(user._id));
  if (staffRole) {
    const deviceOk = await verifyDeviceBindingOnRefresh(
      String(user._id),
      session.deviceFingerprint,
      req,
    );
    if (!deviceOk.ok) {
      void incrementIamMetric("refresh_failure");
      return { ok: false, status: 403, message: deviceOk.reason };
    }
  }
  const newRefreshToken = generateRefreshToken();
  const newHash = hashRefreshToken(newRefreshToken);
  if (!session.sessionFamilyId) {
    session.sessionFamilyId = crypto.randomUUID();
  }
  session.previousRefreshTokenHash = session.refreshTokenHash;
  session.refreshTokenHash = newHash;
  session.rotationGeneration = (session.rotationGeneration ?? 0) + 1;
  session.lastActiveAt = new Date();
  session.expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await session.save();
  const accessToken = signAccessToken({
    _id: String(user._id),
    sessionId: String(session._id),
  });
  await refreshStaffPermissionSnapshot(String(user._id), String(session._id));
  void incrementIamMetric("refresh_success");
  return {
    ok: true,
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: authConfig.ACCESS_TOKEN_EXPIRY,
    sessionId: String(session._id),
  };
}
export function sendRefreshSuccess(
  res: Response,
  result: Extract<
    RefreshSessionResult,
    {
      ok: true;
    }
  >,
): void {
  setAdminSessionCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  const body: Record<string, unknown> = {
    message: "Token refreshed 🚀",
    success: true,
    expiresIn: result.expiresIn,
    sessionId: result.sessionId,
    tokensInCookies: env.FEATURE_ADMIN_HTTPONLY_COOKIES,
  };
  if (!env.FEATURE_ADMIN_HTTPONLY_COOKIES) {
    body.accessToken = result.accessToken;
    body.refreshToken = result.refreshToken;
  }
  res.status(200).json(body);
}
