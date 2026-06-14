import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { UserModel } from "../../models/User.js";
import { resolveStaffRoleForUser } from "../rbac/services/adminStaffResolution.js";
import { sendAdminError, sendAdminOk } from "../rbac/adminResponse.js";
import type { StaffManagementRequest } from "../rbac/middleware/staffManagementContext.js";
import { resolveManagementUserParam } from "../iam/adminUserRef.js";
import {
  endImpersonation,
  getImpersonation,
  startImpersonation,
} from "../iam/impersonation.service.js";
import { incrementIamMetric } from "../iam/iamMetrics.service.js";
import { writeAuditLog } from "../../shared/audit/auditLog.js";
import { AuditAction } from "../../shared/audit/events.js";
export async function postImpersonateUser(
  req: Request,
  res: Response,
): Promise<void> {
  if (!env.FEATURE_ADMIN_IMPERSONATION) {
    sendAdminError(
      res,
      503,
      "FEATURE_DISABLED",
      "Impersonation is not enabled.",
    );
    return;
  }
  const actor = req as StaffManagementRequest;
  const sessionId = actor.user.sessionId;
  if (!sessionId) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "Session required");
    return;
  }
  const param = String(
    (
      req.params as {
        id?: string;
      }
    ).id ?? "",
  );
  const resolved = resolveManagementUserParam(param);
  if ("error" in resolved) {
    sendAdminError(res, 400, "VALIDATION_ERROR", resolved.error);
    return;
  }
  const targetId = resolved.objectId;
  if (targetId === actor.user._id) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "Cannot impersonate yourself");
    return;
  }
  const target = await UserModel.findById(targetId)
    .select("username email staffRole isActive")
    .lean();
  if (!target || !target.isActive) {
    sendAdminError(res, 404, "NOT_FOUND", "User not found");
    return;
  }
  const targetStaff = await resolveStaffRoleForUser(targetId);
  if (targetStaff) {
    sendAdminError(res, 403, "FORBIDDEN", "Cannot impersonate staff accounts");
    return;
  }
  const existing = await getImpersonation(sessionId);
  if (existing) {
    sendAdminError(res, 409, "CONFLICT", "End current impersonation first");
    return;
  }
  const state = await startImpersonation(sessionId, actor.user._id, {
    userId: targetId,
    username: target.username ?? null,
    email: target.email ?? null,
  });
  void incrementIamMetric("impersonation_started");
  void writeAuditLog(req, AuditAction.ADMIN_IMPERSONATION_STARTED, {
    actorId: actor.user._id,
    targetType: "user",
    targetId,
    metadata: { sessionId },
  });
  sendAdminOk(res, {
    impersonation: {
      targetUserId: state.targetUserId,
      targetUsername: state.targetUsername,
      targetEmail: state.targetEmail,
      expiresAt: new Date(state.expiresAt).toISOString(),
    },
  });
}
export async function postEndImpersonation(
  req: Request,
  res: Response,
): Promise<void> {
  const actor = req as StaffManagementRequest;
  const sessionId = actor.user.sessionId;
  if (!sessionId) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "Session required");
    return;
  }
  const active = await getImpersonation(sessionId);
  if (!active) {
    sendAdminOk(res, { ended: false });
    return;
  }
  await endImpersonation(sessionId);
  void incrementIamMetric("impersonation_ended");
  void writeAuditLog(req, AuditAction.ADMIN_IMPERSONATION_ENDED, {
    actorId: actor.user._id,
    targetType: "user",
    targetId: active.targetUserId,
    metadata: { sessionId },
  });
  sendAdminOk(res, { ended: true });
}
