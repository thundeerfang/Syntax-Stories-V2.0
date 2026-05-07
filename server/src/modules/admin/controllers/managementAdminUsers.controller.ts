import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { UserModel } from '../../../models/User.js';
import { SubscriptionModel } from '../../../models/Subscription.js';
import { AdminUserModel } from '../models/AdminUser.js';
import { AdminRoleModel } from '../models/AdminRole.js';
import { sendAdminError, sendAdminOk } from '../adminResponse.js';
import type { StaffManagementRequest } from '../middleware/staffManagementContext.js';
import {
  getActorMaxRoleLevel,
  invalidateAdminPermissionCache,
} from '../services/rbac.service.js';
import type { AdminAccountKind } from '../models/AdminUser.js';
import { staffRoleFromAdminKind } from '../services/adminStaffResolution.js';

const BCRYPT_ROUNDS = 10;

function staffRoleOnUserForKind(kind: AdminAccountKind): 'editor' | 'admin' {
  return staffRoleFromAdminKind(kind);
}

async function uniqueUsernameFromEmail(email: string): Promise<string> {
  const local = email.split('@')[0] ?? 'admin';
  const clean = local.replace(/[^a-z0-9_]/gi, '').toLowerCase().slice(0, 24) || 'admin';
  for (let i = 0; i < 30; i++) {
    const suffix = i === 0 ? '' : `_${Math.random().toString(36).slice(2, 8)}`;
    const candidate = `${clean}${suffix}`.slice(0, 32);
    const exists = await UserModel.findOne({ username: candidate }).select('_id').lean();
    if (!exists) return candidate;
  }
  return `admin_${Date.now().toString(36)}`;
}

export async function getAdminUsers(_req: Request, res: Response): Promise<void> {
  const rows = await AdminUserModel.find()
    .sort({ createdAt: -1 })
    .populate({
      path: 'roleId',
      select: 'name level',
      match: { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] },
    })
    .lean();

  sendAdminOk(res, {
    items: rows.map((r) => {
      const role = r.roleId as unknown as { _id: mongoose.Types.ObjectId; name: string; level: number } | null;
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

export async function postAdminUser(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const body = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
    kind?: AdminAccountKind;
    roleId?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const displayName = body.displayName?.trim();
  const kind = body.kind;
  const roleId = body.roleId?.trim();

  if (!email || !password || password.length < 8) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'email and password (min 8 characters) are required');
    return;
  }
  if (!displayName) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'displayName is required');
    return;
  }
  if (kind !== 'staff' && kind !== 'admin' && kind !== 'super_admin') {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'kind must be staff, admin, or super_admin');
    return;
  }
  if (!roleId || !mongoose.isValidObjectId(roleId)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'roleId is required');
    return;
  }

  const dupAdmin = await AdminUserModel.findOne({ email }).select('_id').lean();
  if (dupAdmin) {
    sendAdminError(res, 409, 'CONFLICT', 'An admin account with this email already exists');
    return;
  }

  const dupUser = await UserModel.findOne({ email }).select('_id').lean();
  if (dupUser) {
    sendAdminError(res, 409, 'CONFLICT', 'A platform user with this email already exists');
    return;
  }

  const role = await AdminRoleModel.findOne({
    _id: roleId,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  })
    .select('level')
    .lean();
  if (!role) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Role not found or archived');
    return;
  }

  const actorMax = await getActorMaxRoleLevel(actor.user._id);
  if ((role.level ?? 0) > actorMax) {
    sendAdminError(res, 403, 'FORBIDDEN', 'Cannot assign a role above your effective level.');
    return;
  }

  const username = await uniqueUsernameFromEmail(email);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const staffRole = staffRoleOnUserForKind(kind);

  let userId: string | null = null;
  try {
    const user = new UserModel({
      fullName: displayName,
      username,
      email,
      staffRole,
      emailVerified: true,
      twoFactorEnabled: false,
      isGoogleAccount: false,
      isGitAccount: false,
      isFacebookAccount: false,
      isXAccount: false,
      isAppleAccount: false,
      isDiscordAccount: false,
    });
    await user.save();
    userId = String(user._id);

    const subscription = await SubscriptionModel.create({
      userId: user._id,
      plan: 'free',
      status: 'active',
      source: 'manual',
    });
    user.subscription = subscription._id;
    await user.save();

    await AdminUserModel.create({
      email,
      passwordHash,
      displayName,
      kind,
      roleId: new mongoose.Types.ObjectId(roleId),
      userId: user._id as mongoose.Types.ObjectId,
      isActive: true,
    });
  } catch (e: unknown) {
    if (userId) {
      await AdminUserModel.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
      await SubscriptionModel.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
      await UserModel.deleteOne({ _id: new mongoose.Types.ObjectId(userId) });
    }
    const dup = typeof e === 'object' && e !== null && 'code' in e && (e as { code: number }).code === 11000;
    if (dup) {
      sendAdminError(res, 409, 'CONFLICT', 'Email or username conflict.');
      return;
    }
    console.error('[postAdminUser]', e);
    sendAdminError(res, 500, 'INTERNAL', 'Failed to create admin user');
    return;
  }

  const created = await AdminUserModel.findOne({ email }).lean();
  if (created) {
    await invalidateAdminPermissionCache(String(created.userId));
  }

  sendAdminOk(res, { ok: true });
}

export async function patchAdminUser(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const rawId = req.params.id;
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  if (!id || !mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid id');
    return;
  }

  const body = req.body as { roleId?: string; isActive?: boolean; kind?: AdminAccountKind };
  const doc = await AdminUserModel.findById(id);
  if (!doc) {
    sendAdminError(res, 404, 'NOT_FOUND', 'Admin user not found');
    return;
  }

  if (String(doc.userId) === actor.user._id) {
    sendAdminError(res, 403, 'FORBIDDEN', 'You cannot edit your own admin record here.');
    return;
  }

  if (body.roleId !== undefined) {
    const roleId = body.roleId.trim();
    if (!mongoose.isValidObjectId(roleId)) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid roleId');
      return;
    }
    const role = await AdminRoleModel.findOne({
      _id: roleId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .select('level')
      .lean();
    if (!role) {
      sendAdminError(res, 404, 'NOT_FOUND', 'Role not found or archived');
      return;
    }
    const actorMax = await getActorMaxRoleLevel(actor.user._id);
    if ((role.level ?? 0) > actorMax) {
      sendAdminError(res, 403, 'FORBIDDEN', 'Cannot assign a role above your effective level.');
      return;
    }
    doc.roleId = new mongoose.Types.ObjectId(roleId);
  }

  if (typeof body.isActive === 'boolean') {
    doc.isActive = body.isActive;
  }

  if (body.kind === 'staff' || body.kind === 'admin' || body.kind === 'super_admin') {
    doc.kind = body.kind;
    await UserModel.updateOne(
      { _id: doc.userId },
      { $set: { staffRole: staffRoleOnUserForKind(body.kind) } }
    );
  }

  await doc.save();
  await invalidateAdminPermissionCache(String(doc.userId));
  sendAdminOk(res, { ok: true });
}
