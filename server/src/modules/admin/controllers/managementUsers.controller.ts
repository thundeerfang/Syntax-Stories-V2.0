import type { Request, Response } from 'express';
import mongoose, { type FilterQuery } from 'mongoose';
import type { IUser } from '../../../models/User.js';
import { UserModel } from '../../../models/User.js';
import { BlogPostModel } from '../../../models/BlogPost.js';
import { SessionModel } from '../../../models/Session.js';
import { SubscriptionModel } from '../../../models/Subscription.js';
import { PaymentLedgerModel } from '../../../models/PaymentLedger.js';
import { sendAdminError, sendAdminOk } from '../adminResponse.js';
import type { StaffManagementRequest } from '../middleware/staffManagementContext.js';

const ADMIN_PROFILE_ALLOWED = new Set(['fullName', 'bio', 'job']);

function notDeleted(): FilterQuery<IUser> {
  return {
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  };
}

function toUserListDto(u: {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  username: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  profileImg?: string;
  subscriptionStatus?: string;
  subscriptionPlanKey?: string;
  subscriptionPeriodEnd?: Date;
  staffRole?: string;
  createdAt: Date;
}) {
  return {
    id: String(u._id),
    fullName: u.fullName,
    username: u.username,
    email: u.email,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    profileImg: u.profileImg ?? null,
    subscriptionStatus: u.subscriptionStatus ?? null,
    subscriptionPlanKey: u.subscriptionPlanKey ?? null,
    subscriptionPeriodEnd: u.subscriptionPeriodEnd?.toISOString() ?? null,
    staffRole: u.staffRole ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

/** Basic ranked search: exact email → exact username → contains email/username → fullName tokens (§13.10). */
export async function searchUsers(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? '20'), 10) || 20, 1), 50);
  if (q.length < 2) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Query q must be at least 2 characters');
    return;
  }

  const qLower = q.toLowerCase();
  const base = notDeleted();

  let items: Array<Record<string, unknown>> = [];

  const exactEmail = await UserModel.findOne({
    ...base,
    email: qLower,
  })
    .select(
      'fullName username email isActive emailVerified lastLoginAt profileImg subscriptionStatus subscriptionPlanKey subscriptionPeriodEnd staffRole createdAt'
    )
    .lean();
  if (exactEmail) {
    items = [exactEmail as unknown as Record<string, unknown>];
  }

  if (items.length === 0) {
    const exactUser = await UserModel.findOne({
      ...base,
      username: new RegExp(`^${escapeRegex(q)}$`, 'i'),
    })
      .select(
        'fullName username email isActive emailVerified lastLoginAt profileImg subscriptionStatus subscriptionPlanKey subscriptionPeriodEnd staffRole createdAt'
      )
      .lean();
    if (exactUser) items = [exactUser as unknown as Record<string, unknown>];
  }

  if (items.length === 0) {
    const partial = await UserModel.find({
      ...base,
      $or: [
        { email: new RegExp(escapeRegex(q), 'i') },
        { username: new RegExp(escapeRegex(q), 'i') },
        { fullName: new RegExp(escapeRegex(q), 'i') },
      ],
    })
      .sort({ _id: -1 })
      .limit(limit)
      .select(
        'fullName username email isActive emailVerified lastLoginAt profileImg subscriptionStatus subscriptionPlanKey subscriptionPeriodEnd staffRole createdAt'
      )
      .lean();
    items = partial as unknown as Array<Record<string, unknown>>;
  }

  sendAdminOk(res, {
    items: items.map((u) => toUserListDto(u as unknown as Parameters<typeof toUserListDto>[0])),
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getUsers(req: Request, res: Response): Promise<void> {
  const r = req as StaffManagementRequest;
  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? '20'), 10) || 20, 1), 100);
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';

  let cursorId: mongoose.Types.ObjectId | null = null;
  if (cursor) {
    try {
      const json = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { id?: string };
      if (json?.id && mongoose.isValidObjectId(json.id)) {
        cursorId = new mongoose.Types.ObjectId(json.id);
      }
    } catch {
      sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid cursor');
      return;
    }
  }

  const filter: Record<string, unknown> = {
    ...notDeleted(),
  };
  if (cursorId) {
    filter._id = { $lt: cursorId };
  }

  const rows = await UserModel.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select(
      'fullName username email isActive emailVerified lastLoginAt profileImg subscriptionStatus subscriptionPlanKey subscriptionPeriodEnd staffRole createdAt'
    )
    .lean();

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? Buffer.from(JSON.stringify({ id: String(last._id) }), 'utf8').toString('base64url')
      : null;

  sendAdminOk(res, {
    items: page.map((u) => toUserListDto(u as unknown as Parameters<typeof toUserListDto>[0])),
    nextCursor,
  });
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid user id');
    return;
  }

  const user = await UserModel.findOne({
    _id: id,
    ...notDeleted(),
  })
    .select(
      '-googleToken -githubToken -facebookToken -xToken -appleToken -discordToken -twoFactorSecret -staffPasswordHash'
    )
    .lean();

  if (!user) {
    sendAdminError(res, 404, 'NOT_FOUND', 'User not found');
    return;
  }

  const uid = user._id as mongoose.Types.ObjectId;

  const [publishedBlogs, draftBlogs, subscription, ledgerCount] = await Promise.all([
    BlogPostModel.countDocuments({
      authorId: uid,
      status: 'published',
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    }),
    BlogPostModel.countDocuments({
      authorId: uid,
      status: 'draft',
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    }),
    user.subscription
      ? SubscriptionModel.findById(user.subscription).lean()
      : Promise.resolve(null),
    PaymentLedgerModel.countDocuments({ userId: uid }),
  ]);

  const oauth = {
    isGoogleAccount: user.isGoogleAccount,
    isGitAccount: user.isGitAccount,
    isFacebookAccount: user.isFacebookAccount,
    isXAccount: user.isXAccount,
    isAppleAccount: user.isAppleAccount,
    isDiscordAccount: user.isDiscordAccount,
  };

  sendAdminOk(res, {
    user: {
      id: String(user._id),
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
      profileImg: user.profileImg,
      twoFactorEnabled: user.twoFactorEnabled,
      profileVersion: user.profileVersion ?? 0,
      staffRole: user.staffRole ?? null,
      stripeCustomerId: user.stripeCustomerId ?? null,
      subscriptionStatus: user.subscriptionStatus ?? null,
      subscriptionPlanKey: user.subscriptionPlanKey ?? null,
      subscriptionPeriodEnd: user.subscriptionPeriodEnd
        ? new Date(user.subscriptionPeriodEnd).toISOString()
        : null,
      followersCount: user.followersCount ?? 0,
      followingCount: user.followingCount ?? 0,
      createdAt: user.createdAt
        ? new Date(user.createdAt as Date).toISOString()
        : new Date(0).toISOString(),
      oauth,
      blog: { published: publishedBlogs, drafts: draftBlogs },
      billing: {
        ledgerEntryCount: ledgerCount,
        subscription: subscription
          ? {
              plan: subscription.plan,
              status: subscription.status,
              currentPeriodEnd: subscription.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toISOString()
                : null,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
              stripeSubscriptionId: subscription.stripeSubscriptionId ?? null,
            }
          : null,
      },
    },
  });
}

export async function patchUserProfile(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid user id');
    return;
  }

  const body = req.body as Record<string, unknown>;
  const expected = body.expectedProfileVersion;
  if (typeof expected !== 'number' || !Number.isFinite(expected)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'expectedProfileVersion is required');
    return;
  }

  const patch: Record<string, string> = {};
  for (const key of Object.keys(body)) {
    if (key === 'expectedProfileVersion') continue;
    if (!ADMIN_PROFILE_ALLOWED.has(key)) {
      sendAdminError(res, 400, 'VALIDATION_ERROR', `Field not allowed: ${key}`);
      return;
    }
    const v = body[key];
    if (typeof v !== 'string') {
      sendAdminError(res, 400, 'VALIDATION_ERROR', `Invalid type for ${key}`);
      return;
    }
    patch[key] = v;
  }

  const user = await UserModel.findOne({ _id: id, ...notDeleted() }).select('profileVersion');
  if (!user) {
    sendAdminError(res, 404, 'NOT_FOUND', 'User not found');
    return;
  }
  if ((user.profileVersion ?? 0) !== expected) {
    sendAdminError(res, 409, 'CONFLICT', 'Profile was modified elsewhere. Refresh and retry.');
    return;
  }

  const nextVersion = (user.profileVersion ?? 0) + 1;
  await UserModel.updateOne(
    { _id: id, profileVersion: expected },
    {
      $set: { ...patch, profileVersion: nextVersion, profileUpdatedAt: new Date() },
    }
  );

  const after = await UserModel.findById(id).select('profileVersion').lean();
  sendAdminOk(res, { profileVersion: after?.profileVersion ?? nextVersion });
}

export async function postLockUser(req: Request, res: Response): Promise<void> {
  const r = req as StaffManagementRequest;
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid user id');
    return;
  }
  if (id === r.user._id) {
    sendAdminError(res, 403, 'FORBIDDEN', 'Cannot change lock state on your own account from this API.');
    return;
  }

  const result = await UserModel.updateOne(
    { _id: id, ...notDeleted() },
    { $set: { isActive: false } }
  );
  if (result.matchedCount === 0) {
    sendAdminError(res, 404, 'NOT_FOUND', 'User not found');
    return;
  }
  sendAdminOk(res, { locked: true });
}

export async function postUnlockUser(req: Request, res: Response): Promise<void> {
  const r = req as StaffManagementRequest;
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid user id');
    return;
  }
  if (id === r.user._id) {
    sendAdminError(res, 403, 'FORBIDDEN', 'Cannot change lock state on your own account from this API.');
    return;
  }

  const result = await UserModel.updateOne(
    { _id: id, ...notDeleted() },
    { $set: { isActive: true } }
  );
  if (result.matchedCount === 0) {
    sendAdminError(res, 404, 'NOT_FOUND', 'User not found');
    return;
  }
  sendAdminOk(res, { locked: false });
}

export async function postRevokeAllSessions(req: Request, res: Response): Promise<void> {
  const r = req as StaffManagementRequest;
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Invalid user id');
    return;
  }
  if (id === r.user._id) {
    sendAdminError(res, 403, 'FORBIDDEN', 'Cannot revoke your own sessions via target user endpoint.');
    return;
  }

  const result = await SessionModel.updateMany(
    { userId: id, revoked: false },
    { $set: { revoked: true } }
  );
  sendAdminOk(res, { revokedCount: result.modifiedCount });
}
