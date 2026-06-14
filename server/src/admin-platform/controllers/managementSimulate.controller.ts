import type { Request, Response } from "express";
import mongoose from "mongoose";
import { AdminRoleModel } from "../rbac/models/AdminRole.js";
import { getMergedPermissionKeySet } from "../rbac/services/adminPermissionCatalog.service.js";
import { sendAdminError, sendAdminOk } from "../rbac/adminResponse.js";
import { authorize } from "../iam/policyEngine.service.js";
import type { StaffManagementRequest } from "../rbac/middleware/staffManagementContext.js";
import { securityZonesForPermissions } from "../iam/securityZones.config.js";
import { permissionsToCapabilityIds } from "../iam/permissionCapabilities.js";
export async function postIamSimulate(
  req: Request,
  res: Response,
): Promise<void> {
  const actorReq = req as StaffManagementRequest;
  const body = req.body as {
    roleId?: string;
    permissions?: string[];
    action?: string;
  };
  const action = body.action?.trim();
  if (!action) {
    sendAdminError(
      res,
      400,
      "VALIDATION_ERROR",
      "action is required (permission key)",
    );
    return;
  }
  const catalog = await getMergedPermissionKeySet();
  if (!catalog.has(action)) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "Unknown permission action");
    return;
  }
  let permissions: string[] = [];
  let roleName: string | null = null;
  if (body.roleId?.trim()) {
    if (!mongoose.isValidObjectId(body.roleId)) {
      sendAdminError(res, 400, "VALIDATION_ERROR", "Invalid roleId");
      return;
    }
    const role = await AdminRoleModel.findOne({
      _id: body.roleId,
      deletedAt: null,
    })
      .select("name permissions")
      .lean();
    if (!role) {
      sendAdminError(res, 404, "NOT_FOUND", "Role not found");
      return;
    }
    roleName = role.name;
    permissions = (role.permissions ?? []).filter((p) => catalog.has(p));
  } else if (Array.isArray(body.permissions)) {
    permissions = body.permissions
      .map((p) => String(p).trim())
      .filter((p) => catalog.has(p));
  } else {
    sendAdminError(
      res,
      400,
      "VALIDATION_ERROR",
      "roleId or permissions[] required",
    );
    return;
  }
  const simulatedReq = {
    ...actorReq,
    adminPermissions: new Set(permissions),
  } as StaffManagementRequest;
  const result = await authorize({ req: simulatedReq, permission: action });
  sendAdminOk(res, {
    allowed: result.allow,
    action,
    roleName,
    permissionCount: permissions.length,
    securityZones: securityZonesForPermissions(permissions),
    capabilityIds: permissionsToCapabilityIds(permissions),
    ...(result.allow ? {} : { reason: result.message, code: result.code }),
  });
}
