import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { UserModel } from '../../models/User.js';
import { SubscriptionModel } from '../../models/Subscription.js';
import { AdminUserModel } from '../rbac/models/AdminUser.js';
import { AdminRoleModel } from '../rbac/models/AdminRole.js';
import type { AdminAccountKind } from '../rbac/models/AdminUser.js';
import { staffRoleFromAdminKind } from '../rbac/services/adminStaffResolution.js';
import { invalidateAdminPermissionCache } from '../rbac/services/rbac.service.js';
import type { AdminErrorCode } from '../rbac/adminResponse.js';
import {
  consumeEmailVerificationToken,
  isAdminOperatorPasswordValid,
} from './adminInviteOtp.service.js';

const BCRYPT_ROUNDS = 10;

export type CreateOperatorInput = {
  email: string;
  password: string;
  displayName: string;
  kind: AdminAccountKind;
  roleId: string;
  emailVerificationToken: string;
};

export type CreateOperatorResult =
  | { ok: true; userId: string; adminUserId: string }
  | { ok: false; status: number; code: AdminErrorCode; message: string };

async function uniqueUsernameFromEmail(email: string): Promise<string> {
  const local = email.split('@')[0] ?? 'admin';
  const clean =
    local
      .replace(/[^a-z0-9_]/gi, '')
      .toLowerCase()
      .slice(0, 24) || 'admin';
  for (let i = 0; i < 30; i++) {
    const suffix = i === 0 ? '' : `_${Math.random().toString(36).slice(2, 8)}`;
    const candidate = `${clean}${suffix}`.slice(0, 32);
    const exists = await UserModel.findOne({ username: candidate }).select('_id').lean();
    if (!exists) return candidate;
  }
  return `admin_${Date.now().toString(36)}`;
}

export async function createOperator(input: CreateOperatorInput): Promise<CreateOperatorResult> {
  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();
  const displayName = input.displayName.trim();
  const { kind, roleId, emailVerificationToken } = input;

  if (!emailVerificationToken?.trim()) {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Email must be verified before creating an operator',
    };
  }
  const verified = await consumeEmailVerificationToken(emailVerificationToken.trim(), email);
  if (!verified) {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Email verification expired. Verify the email again.',
    };
  }

  if (!email || !password) {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Email and password are required',
    };
  }
  if (!isAdminOperatorPasswordValid(password)) {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message:
        'Password must be more than 10 characters with at least one uppercase and one lowercase letter',
    };
  }
  if (!displayName) {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'displayName is required',
    };
  }
  if (kind !== 'staff' && kind !== 'admin' && kind !== 'super_admin') {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'kind must be staff, admin, or super_admin',
    };
  }
  if (!roleId || !mongoose.isValidObjectId(roleId)) {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'roleId is required',
    };
  }

  const dupAdmin = await AdminUserModel.findOne({ email }).select('_id').lean();
  if (dupAdmin) {
    return {
      ok: false,
      status: 409,
      code: 'CONFLICT',
      message: 'An admin account with this email already exists',
    };
  }

  const dupUser = await UserModel.findOne({ email }).select('_id').lean();
  if (dupUser) {
    return {
      ok: false,
      status: 409,
      code: 'CONFLICT',
      message: 'A platform user with this email already exists',
    };
  }

  const role = await AdminRoleModel.findOne({
    _id: roleId,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  })
    .select('level')
    .lean();
  if (!role) {
    return { ok: false, status: 404, code: 'NOT_FOUND', message: 'Role not found or archived' };
  }

  const username = await uniqueUsernameFromEmail(email);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const staffRole = staffRoleFromAdminKind(kind);

  let userId: string | null = null;
  try {
    const user = new UserModel({
      fullName: displayName,
      username,
      email,
      staffRole,
      emailVerified: true,
      twoFactorEnabled: true,
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

    const adminUser = await AdminUserModel.create({
      email,
      passwordHash,
      displayName,
      kind,
      roleId: new mongoose.Types.ObjectId(roleId),
      userId: user._id as mongoose.Types.ObjectId,
      isActive: true,
    });

    await invalidateAdminPermissionCache(userId);
    return { ok: true, userId, adminUserId: String(adminUser._id) };
  } catch (e: unknown) {
    if (userId) {
      await AdminUserModel.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
      await SubscriptionModel.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
      await UserModel.deleteOne({ _id: new mongoose.Types.ObjectId(userId) });
    }
    const dup =
      typeof e === 'object' && e !== null && 'code' in e && (e as { code: number }).code === 11000;
    if (dup) {
      return { ok: false, status: 409, code: 'CONFLICT', message: 'Email or username conflict.' };
    }
    console.error('[createOperator]', e);
    return { ok: false, status: 500, code: 'INTERNAL', message: 'Failed to create admin user' };
  }
}
