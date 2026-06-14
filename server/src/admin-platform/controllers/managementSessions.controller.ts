import type { Request, Response } from "express";
import { SessionModel } from "../../models/Session.js";
import type { StaffManagementRequest } from "../rbac/middleware/staffManagementContext.js";
import { sendAdminError, sendAdminOk } from "../rbac/adminResponse.js";
import { writeAuditLog } from "../../shared/audit/auditLog.js";
import { AuditAction } from "../../shared/audit/events.js";
import { logSecurityEvent } from "../../modules/auth/securityEventLog.js";
export async function listMySessions(
  req: Request,
  res: Response,
): Promise<void> {
  const actor = req as StaffManagementRequest;
  const userId = actor.user._id;
  const currentSessionId = actor.user.sessionId;
  const sessions = await SessionModel.find({
    userId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastActiveAt: -1 })
    .limit(50)
    .lean();
  sendAdminOk(res, {
    currentSessionId: currentSessionId ?? null,
    sessions: sessions.map((s) => ({
      id: String(s._id),
      deviceName: s.deviceName,
      ip: s.ip ?? null,
      userAgent: s.userAgent ?? null,
      deviceFingerprint: s.deviceFingerprint ?? null,
      rotationGeneration: s.rotationGeneration ?? 0,
      lastActiveAt: s.lastActiveAt?.toISOString?.() ?? null,
      createdAt: s.createdAt?.toISOString?.() ?? null,
      expiresAt: s.expiresAt?.toISOString?.() ?? null,
      isCurrent: currentSessionId ? String(s._id) === currentSessionId : false,
    })),
  });
}
export async function revokeMySession(
  req: Request,
  res: Response,
): Promise<void> {
  const actor = req as StaffManagementRequest;
  const sessionId =
    typeof req.params.sessionId === "string" ? req.params.sessionId.trim() : "";
  if (!sessionId) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "sessionId required");
    return;
  }
  const session = await SessionModel.findOne({
    _id: sessionId,
    userId: actor.user._id,
  });
  if (!session || session.revoked) {
    sendAdminError(res, 404, "NOT_FOUND", "Session not found");
    return;
  }
  if (sessionId === actor.user.sessionId) {
    sendAdminError(
      res,
      400,
      "VALIDATION_ERROR",
      "Use logout to end your current session.",
    );
    return;
  }
  session.revoked = true;
  session.revokedReason = "admin_revoked";
  await session.save();
  await logSecurityEvent(actor.user._id, "session_revoked", req, { sessionId });
  void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
    actorId: actor.user._id,
    metadata: { sessionId, scope: "self_other" },
  });
  sendAdminOk(res, { ok: true });
}
export async function revokeOtherSessions(
  req: Request,
  res: Response,
): Promise<void> {
  const actor = req as StaffManagementRequest;
  if (!actor.user.sessionId) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "Current session missing");
    return;
  }
  await SessionModel.updateMany(
    {
      userId: actor.user._id,
      _id: { $ne: actor.user.sessionId },
      revoked: false,
    },
    { $set: { revoked: true, revokedReason: "admin_revoke_others" } },
  );
  await logSecurityEvent(actor.user._id, "session_revoked", req, {
    scope: "others",
  });
  void writeAuditLog(req, AuditAction.SESSION_REVOKED, {
    actorId: actor.user._id,
    metadata: { scope: "others" },
  });
  sendAdminOk(res, { ok: true });
}
