import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { UserModel } from '../../models/User.js';
import { SubscriptionModel } from '../../models/Subscription.js';
import { AdminUserModel } from '../rbac/models/AdminUser.js';
import { AdminRoleModel } from '../rbac/models/AdminRole.js';
import {
  BOOTSTRAP_ADMIN_USERNAME,
  SUPER_ADMIN_ROLE_NAME,
  SYNTAX_ADMIN_EMAIL,
} from './bootstrap.constants.js';
import { applySeedTwoFactor, printTwoFactorSeedBanner } from './seedOperatorTwoFactor.js';

const BCRYPT_ROUNDS = 10;

type TwoFactorSeedMode = 'disabled' | 'setup_required' | 'preconfigured';

function resolveTwoFactorMode(options?: BootstrapOperatorOptions): TwoFactorSeedMode {
  if (options?.configureTwoFactor) return 'preconfigured';
  if (options?.requireTwoFactorSetup) return 'setup_required';
  return 'disabled';
}

async function resolveBootstrapUsername(email: string): Promise<string> {
  const local = email.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '_') || 'admin';
  const base = `${local}_admin`.slice(0, 28);
  let candidate = base;
  let suffix = 0;
  while (await UserModel.exists({ username: candidate })) {
    suffix += 1;
    candidate = `${base}_${suffix}`.slice(0, 32);
  }
  return candidate;
}

async function applyTwoFactorUserState(
  userId: import('mongoose').Types.ObjectId,
  mode: TwoFactorSeedMode
): Promise<void> {
  if (mode === 'disabled') {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { twoFactorEnabled: false }, $unset: { twoFactorSecret: 1 } }
    );
    return;
  }
  if (mode === 'setup_required') {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { twoFactorEnabled: true }, $unset: { twoFactorSecret: 1 } }
    );
  }
}

async function ensurePlatformUser(
  email: string,
  mode: TwoFactorSeedMode
): Promise<{ _id: import('mongoose').Types.ObjectId }> {
  const existing = await UserModel.findOne({ email }).select('_id staffRole').lean();
  if (existing?._id) {
    await UserModel.updateOne(
      { _id: existing._id },
      {
        $set: {
          staffRole: 'admin',
          emailVerified: true,
        },
      }
    );
    await applyTwoFactorUserState(existing._id as import('mongoose').Types.ObjectId, mode);
    return { _id: existing._id as import('mongoose').Types.ObjectId };
  }

  const username = (await UserModel.exists({ username: BOOTSTRAP_ADMIN_USERNAME }))
    ? await resolveBootstrapUsername(email)
    : BOOTSTRAP_ADMIN_USERNAME;

  const user = new UserModel({
    fullName: 'Syntax Administrator',
    username,
    email,
    staffRole: 'admin',
    isGoogleAccount: false,
    isGitAccount: false,
    isFacebookAccount: false,
    isXAccount: false,
    isAppleAccount: false,
    isDiscordAccount: false,
    emailVerified: true,
    twoFactorEnabled: mode !== 'disabled',
  });
  await user.save();
  const subscription = await SubscriptionModel.create({
    userId: user._id,
    plan: 'free',
    status: 'active',
    source: 'manual',
  });
  user.subscription = subscription._id;
  await user.save();
  if (mode === 'setup_required') {
    await applyTwoFactorUserState(user._id as import('mongoose').Types.ObjectId, mode);
  }
  return { _id: user._id as import('mongoose').Types.ObjectId };
}

/**
 * Ensures bootstrap platform user + admin_users row linked to Super Admin role.
 * Credentials live on admin_users (preferred for staff-login).
 */
export type BootstrapOperatorOptions = {
  email?: string;
  password?: string;
  /** Re-hash password even when admin_users row already exists. */
  forcePassword?: boolean;
  /**
   * First login: password sign-in succeeds, admin UI blocks until authenticator is configured.
   * (twoFactorEnabled=true, no secret yet)
   */
  requireTwoFactorSetup?: boolean;
  /** Dev-only: pre-configure TOTP and print QR in terminal. */
  configureTwoFactor?: boolean;
  /** Fixed base32 secret; falls back to ADMIN_BOOTSTRAP_2FA_SECRET env. */
  twoFactorSecret?: string;
  /** Print QR + secret in terminal (default true when configureTwoFactor). */
  printTwoFactorQr?: boolean;
};

export async function seedBootstrapOperator(options?: BootstrapOperatorOptions): Promise<void> {
  const email = (options?.email ?? SYNTAX_ADMIN_EMAIL).toLowerCase();
  const password = options?.password ?? env.ADMIN_BOOTSTRAP_PASSWORD;
  const twoFactorMode = resolveTwoFactorMode(options);

  if (!password) {
    console.warn(
      `[seed] Bootstrap operator skipped for ${email}: set ADMIN_BOOTSTRAP_PASSWORD (required in production).`
    );
    return;
  }

  const superRole = await AdminRoleModel.findOne({
    name: SUPER_ADMIN_ROLE_NAME,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  })
    .select('_id')
    .lean();

  if (!superRole?._id) {
    console.warn(
      '[seed] Bootstrap operator skipped: Super Admin role not found. Run seedDefaultRoles first.'
    );
    return;
  }

  const user = await ensurePlatformUser(email, twoFactorMode);
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const existingAdmin = await AdminUserModel.findOne({ email })
    .select('+passwordHash userId')
    .lean();

  if (existingAdmin) {
    const patch: Record<string, unknown> = {
      roleId: superRole._id,
      kind: 'super_admin',
      isActive: true,
      displayName: 'Syntax Administrator',
      userId: user._id,
    };
    if (!existingAdmin.passwordHash || options?.forcePassword) {
      patch.passwordHash = passwordHash;
    }
    await AdminUserModel.updateOne({ email }, { $set: patch });
    console.log(`[seed] Bootstrap operator ${email} — admin_users updated`);
  } else {
    await AdminUserModel.create({
      email,
      passwordHash,
      displayName: 'Syntax Administrator',
      kind: 'super_admin',
      roleId: superRole._id,
      userId: user._id,
      isActive: true,
    });
    console.log(`[seed] Bootstrap operator ${email} — created (POST /auth/staff-login)`);
  }

  if (twoFactorMode === 'preconfigured') {
    const fixedSecret =
      options?.twoFactorSecret?.trim() || process.env.ADMIN_BOOTSTRAP_2FA_SECRET?.trim();
    const { secret, otpauthUrl } = await applySeedTwoFactor(user._id, email, fixedSecret);
    if (options?.printTwoFactorQr !== false) {
      await printTwoFactorSeedBanner(email, secret, otpauthUrl);
    }
    console.log(`[seed] Bootstrap operator ${email} — 2FA pre-configured`);
  } else if (twoFactorMode === 'setup_required') {
    console.log(
      `[seed] Bootstrap operator ${email} — 2FA setup required on first admin login (scan QR in UI)`
    );
  }
}
