import type { Request, Response } from "express";
import { sendAdminError, sendAdminOk } from "../rbac/adminResponse.js";
import type { StaffManagementRequest } from "../rbac/middleware/staffManagementContext.js";
import {
  getAdminSessionIdleStatus,
  touchAdminSessionActivity,
} from "../iam/adminSessionIdle.service.js";
export async function getSessionIdleStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const mgmt = req as StaffManagementRequest;
  const sessionId = mgmt.user.sessionId;
  const userId = mgmt.user._id;
  if (!sessionId) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "No active session");
    return;
  }
  const status = await getAdminSessionIdleStatus(sessionId, userId);
  if (!status) {
    sendAdminError(res, 404, "NOT_FOUND", "Session not found");
    return;
  }
  sendAdminOk(res, status);
}
export async function postSessionTouch(
  req: Request,
  res: Response,
): Promise<void> {
  const mgmt = req as StaffManagementRequest;
  const sessionId = mgmt.user.sessionId;
  const userId = mgmt.user._id;
  if (!sessionId) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "No active session");
    return;
  }
  const current = await getAdminSessionIdleStatus(sessionId, userId);
  if (!current) {
    sendAdminError(res, 404, "NOT_FOUND", "Session not found");
    return;
  }
  if (!current.confirmationRequired) {
    await touchAdminSessionActivity(sessionId);
  }
  const status = await getAdminSessionIdleStatus(sessionId, userId);
  if (!status) {
    sendAdminError(res, 404, "NOT_FOUND", "Session not found");
    return;
  }
  sendAdminOk(res, status);
}
