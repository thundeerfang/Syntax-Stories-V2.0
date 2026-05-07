import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AdminRoleModel } from '../models/AdminRole.js';
import { AdminUserModel } from '../models/AdminUser.js';
import { sendAdminError, sendAdminOk } from '../adminResponse.js';
import type { StaffManagementRequest } from '../middleware/staffManagementContext.js';
import {
  getActorMaxRoleLevel,
  invalidateAdminPermissionCache,
  invalidateAllStaffAdminPermissionCaches,
} from '../services/rbac.service.js';

function includeDeleted(req: Request): boolean {
  const v = req.query.includeDeleted;
  return v === '1' || v === 'true';
}

export async function getRoles(req: Request, res: Response): Promise<void> {
  const q = includeDeleted(req)
    ? {}
    : { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
  const roles = await AdminRoleModel.find(q).sort({ level: -1, name: 1 }).lean();
  sendAdminOk(res, {
    roles: roles.map((r) => ({
      id: String(r._id),
      name: r.name,
      level: r.level,
      permissions: r.permissions ?? [],
      description: r.description ?? null,
      deletedAt: r.deletedAt?.toISOString?.() ?? null,
    })),
  });
}

export async function postRole(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const body = req.body as {
    name?: string;
    level?: number;
    permissions?: string[];
    description?: string;
  };
  const name = body.name?.trim();
  if (!name || name.length > 120) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'name is required');
    return;
  }
  if (typeof body.level !== 'number' || body.level < 0 || body.level > 1000) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'level must be 0–1000');
    return;
  }
  const actorMax = await getActorMaxRoleLevel(actor.user._id);
  if (body.level > actorMax) {
    sendAdminError(res, 403, 'FORBIDDEN', 'Cannot create a role above your effective level.');
    return;
  }
  const perms = Array.isArray(body.permissions) ? body.permissions.map((p) => String(p).trim()).filter(Boolean) : [];
  if (perms.length > 200) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'At most 200 permissions');
    return;
  }
  const clash = await AdminRoleModel.findOne({ name, deletedAt: null }).lean();
  if (clash) {
    sendAdminError(res, 409, 'CONFLICT', 'Role name already exists');
    return;
  }
  const doc = await AdminRoleModel.create({
    name,
    level: body.level,
    permissions: perms,
    description: body.description?.trim(),
  });
  await invalidateAllStaffAdminPermissionCaches();
  sendAdminOk(res, { id: String(doc._id) });
}

export async function patchRole(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const doc = await AdminRoleModel.findOne({ _id: id, deletedAt: null });
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Role not found');
    return;
  }
  const body = req.body as {
    name?: string;
    level?: number;
    permissions?: string[];
    description?: string | null;
  };
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid name');
      return;
    }
    const clash = await AdminRoleModel.findOne({ name, deletedAt: null, _id: { $ne: doc._id } }).lean();
    if (clash) {
      sendAdminError(res, 409, 'CONFLICT', 'Role name already in use');
      return;
    }
    doc.name = name;
  }
  if (body.level !== undefined) {
    if (typeof body.level !== 'number' || body.level < 0 || body.level > 1000) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'level must be 0–1000');
      return;
    }
    const actorMax = await getActorMaxRoleLevel(actor.user._id);
    if (body.level > actorMax) {
      sendAdminError(res, 403, 'FORBIDDEN', 'Cannot set level above your effective level.');
      return;
    }
    doc.level = body.level;
  }
  if (body.permissions !== undefined) {
    const perms = Array.isArray(body.permissions)
      ? body.permissions.map((p) => String(p).trim()).filter(Boolean)
      : [];
    if (perms.length > 200) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'At most 200 permissions');
      return;
    }
    doc.permissions = perms;
  }
  if (body.description !== undefined) doc.description = body.description?.trim() ?? undefined;
  await doc.save();
  await invalidateAllStaffAdminPermissionCaches();
  const users = await AdminUserModel.find({ roleId: doc._id }).select('userId').lean();
  for (const u of users) {
    await invalidateAdminPermissionCache(String(u.userId));
  }
  sendAdminOk(res, { ok: true });
}

export async function deleteRoleSoft(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const doc = await AdminRoleModel.findOne({ _id: id, deletedAt: null });
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Role not found');
    return;
  }
  const activeUsers = await AdminUserModel.countDocuments({ roleId: doc._id, isActive: true });
  if (activeUsers > 0) {
    sendAdminError(res, 409, 'CONFLICT', 'Archive admin users using this role first, or reassign them.');
    return;
  }
  doc.deletedAt = new Date();
  doc.deletedById = new mongoose.Types.ObjectId(actor.user._id);
  await doc.save();
  await invalidateAllStaffAdminPermissionCaches();
  sendAdminOk(res, { ok: true });
}

export async function postRoleRestore(req: Request, res: Response): Promise<void> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }
  const doc = await AdminRoleModel.findById(id);
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Role not found');
    return;
  }
  const clash = await AdminRoleModel.findOne({ name: doc.name, deletedAt: null, _id: { $ne: doc._id } }).lean();
  if (clash) {
    sendAdminError(res, 409, 'CONFLICT', 'Another active role uses this name');
    return;
  }
  doc.deletedAt = null;
  doc.deletedById = null;
  await doc.save();
  await invalidateAllStaffAdminPermissionCaches();
  sendAdminOk(res, { ok: true });
}
