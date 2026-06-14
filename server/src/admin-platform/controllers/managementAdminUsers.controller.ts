import type { Request, Response } from "express";
import mongoose from "mongoose";
import { UserModel } from "../../models/User.js";
import { AdminUserModel } from "../rbac/models/AdminUser.js";
import { AdminRoleModel } from "../rbac/models/AdminRole.js";
import { sendAdminError, sendAdminOk } from "../rbac/adminResponse.js";
import type { StaffManagementRequest } from "../rbac/middleware/staffManagementContext.js";
import {
  getActorMaxRoleLevel,
  invalidateAdminPermissionCache,
} from "../rbac/services/rbac.service.js";
import type { AdminAccountKind } from "../rbac/models/AdminUser.js";
import { staffRoleFromAdminKind } from "../rbac/services/adminStaffResolution.js";
import { createOperator } from "../auth/operator.service.js";
import { writeAuditLog } from "../../shared/audit/auditLog.js";
import { AuditAction } from "../../shared/audit/events.js";
function staffRoleOnUserForKind(kind: AdminAccountKind): "editor" | "admin" {
  return staffRoleFromAdminKind(kind);
}
export async function getAdminUsers(
  _req: Request,
  res: Response,
): Promise<void> {
  const rows = await AdminUserModel.find()
    .sort({ createdAt: -1 })
    .populate({
      path: "roleId",
      select: "name level",
      match: { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
    })
    .lean();
  sendAdminOk(res, {
    items: rows.map((r) => {
      const role = r.roleId as unknown as {
        _id: mongoose.Types.ObjectId;
        name: string;
        level: number;
      } | null;
      return {
        id: String(r._id),
        email: r.email,
        displayName: r.displayName,
        kind: r.kind,
        isActive: r.isActive,
        userId: String(r.userId),
        roleId: role ? String(role._id) : null,
        roleName: role?.name ?? null,
        roleLevel: role?.level ?? null,
        createdAt: r.createdAt?.toISOString?.() ?? null,
      };
    }),
  });
}
export async function postAdminUser(
  req: Request,
  res: Response,
): Promise<void> {
  const actor = req as StaffManagementRequest;
  const body = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
    kind?: AdminAccountKind;
    roleId?: string;
    emailVerificationToken?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password?.trim() ?? "";
  const displayName = body.displayName?.trim() ?? "";
  const kind = body.kind;
  const roleId = body.roleId?.trim() ?? "";
  const role = await AdminRoleModel.findOne({
    _id: roleId,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  })
    .select("level")
    .lean();
  if (role) {
    const actorMax = await getActorMaxRoleLevel(actor.user._id);
    if ((role.level ?? 0) > actorMax) {
      sendAdminError(
        res,
        403,
        "FORBIDDEN",
        "Cannot assign a role above your effective level.",
      );
      return;
    }
  }
  const result = await createOperator({
    email,
    password,
    displayName,
    kind: kind as AdminAccountKind,
    roleId,
    emailVerificationToken: body.emailVerificationToken?.trim() ?? "",
  });
  if (!result.ok) {
    sendAdminError(res, result.status, result.code, result.message);
    return;
  }
  void writeAuditLog(req, AuditAction.ADMIN_OPERATOR_CREATED, {
    actorId: actor.user._id,
    metadata: { email, roleId, kind, displayName },
  });
  sendAdminOk(res, { ok: true });
}
export async function patchAdminUser(
  req: Request,
  res: Response,
): Promise<void> {
  const actor = req as StaffManagementRequest;
  const rawId = req.params.id;
  const id = typeof rawId === "string" ? rawId.trim() : "";
  if (!id || !mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "Invalid id");
    return;
  }
  const body = req.body as {
    roleId?: string;
    isActive?: boolean;
    kind?: AdminAccountKind;
  };
  const doc = await AdminUserModel.findById(id);
  if (!doc) {
    sendAdminError(res, 404, "NOT_FOUND", "Admin user not found");
    return;
  }
  if (String(doc.userId) === actor.user._id) {
    sendAdminError(
      res,
      403,
      "FORBIDDEN",
      "You cannot edit your own admin record here.",
    );
    return;
  }
  if (body.roleId !== undefined) {
    const roleId = body.roleId.trim();
    if (!mongoose.isValidObjectId(roleId)) {
      sendAdminError(res, 400, "VALIDATION_ERROR", "Invalid roleId");
      return;
    }
    const role = await AdminRoleModel.findOne({
      _id: roleId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .select("level")
      .lean();
    if (!role) {
      sendAdminError(res, 404, "NOT_FOUND", "Role not found or archived");
      return;
    }
    const actorMax = await getActorMaxRoleLevel(actor.user._id);
    if ((role.level ?? 0) > actorMax) {
      sendAdminError(
        res,
        403,
        "FORBIDDEN",
        "Cannot assign a role above your effective level.",
      );
      return;
    }
    doc.roleId = new mongoose.Types.ObjectId(roleId);
  }
  if (typeof body.isActive === "boolean") {
    doc.isActive = body.isActive;
  }
  if (
    body.kind === "staff" ||
    body.kind === "admin" ||
    body.kind === "super_admin"
  ) {
    doc.kind = body.kind;
    await UserModel.updateOne(
      { _id: doc.userId },
      { $set: { staffRole: staffRoleOnUserForKind(body.kind) } },
    );
  }
  await doc.save();
  await invalidateAdminPermissionCache(String(doc.userId));
  void writeAuditLog(req, AuditAction.ADMIN_OPERATOR_UPDATED, {
    actorId: actor.user._id,
    targetType: "admin_user",
    targetId: String(doc._id),
    metadata: {
      roleId: body.roleId,
      isActive: body.isActive,
      kind: body.kind,
    },
  });
  sendAdminOk(res, { ok: true });
}
