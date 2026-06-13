import type { Request, Response } from 'express';
import mongoose, { type FilterQuery } from 'mongoose';
import type { IUser } from '../../models/User.js';
import { UserModel, normalizeProfileImg } from '../../models/User.js';
import { BlogPostModel } from '../../models/BlogPost.js';
import { SessionModel } from '../../models/Session.js';
import { SubscriptionModel } from '../../models/Subscription.js';
import { PaymentLedgerModel } from '../../models/PaymentLedger.js';
import { FollowModel } from '../../models/Follow.js';
import { env } from '../../config/env.js';
import { encodeAdminUserRef, resolveManagementUserParam } from '../iam/adminUserRef.js';
import { rebacAllows } from '../iam/rebac/rebac.service.js';
import { sendAdminError, sendAdminOk } from '../rbac/adminResponse.js';
import type { StaffManagementRequest } from '../rbac/middleware/staffManagementContext.js';
import {
  USER_LIST_FIELDS,
  toUserListDto,
  toUserOAuthDto,
  toUserProfileDto,
  type UserListRow,
} from './managementUsers.mapper.js';
import {
  loadAdminUserActivity,
  resolveEmailVerificationForAdmin,
} from './managementUserActivity.service.js';

const ADMIN_PROFILE_ALLOWED = new Set(['fullName', 'bio', 'job']);

function notDeleted(): FilterQuery<IUser> {
  return {
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  };
}

function accountTypeFilter(accountType: string | undefined): FilterQuery<IUser> | Record<string, never> {
  if (accountType === 'platform') {
    return {
      $or: [{ staffRole: null }, { staffRole: { $exists: false } }],
    };
  }
  if (accountType === 'staff') {
    return { staffRole: { $exists: true, $nin: [null, ''] } };
  }
  return {};
}

function mapListRow(u: unknown) {
  return toUserListDto(u as UserListRow, encodeAdminUserRef);
}

/** Basic ranked search: exact email → exact username → contains email/username → fullName tokens (§13.10). */
export async function searchUsers(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limit = Math.min(
    Math.max(Number.parseInt(String(req.query.limit ?? '20'), 10) || 20, 1),
    50
  );
  if (q.length < 2) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'Query q must be at least 2 characters');
    return;
  }

  const qLower = q.toLowerCase();
  const accountType =
    typeof req.query.accountType === 'string' ? req.query.accountType.trim() : '';
  const base = { ...notDeleted(), ...accountTypeFilter(accountType) };

  let items: Array<Record<string, unknown>> = [];

  const exactEmail = await UserModel.findOne({
    ...base,
    email: qLower,
  })
    .select(USER_LIST_FIELDS)
    .lean();
  if (exactEmail) {
    items = [exactEmail as unknown as Record<string, unknown>];
  }

  if (items.length === 0) {
    const exactUser = await UserModel.findOne({
      ...base,
      username: new RegExp(`^${escapeRegex(q)}$`, 'i'),
    })
      .select(USER_LIST_FIELDS)
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
      .select(USER_LIST_FIELDS)
      .lean();
    items = partial as unknown as Array<Record<string, unknown>>;
  }

  sendAdminOk(res, {
    items: items.map((u) => mapListRow(u)),
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getUsers(req: Request, res: Response): Promise<void> {
  const limit = Math.min(
    Math.max(Number.parseInt(String(req.query.limit ?? '20'), 10) || 20, 1),
    100
  );
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const accountType =
    typeof req.query.accountType === 'string' ? req.query.accountType.trim() : '';

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

  const filter: FilterQuery<IUser> = {
    ...notDeleted(),
    ...accountTypeFilter(accountType),
  };
  if (cursorId) {
    filter._id = { $lt: cursorId };
  }

  const rows = await UserModel.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .select(USER_LIST_FIELDS)
    .lean();

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? Buffer.from(JSON.stringify({ id: String(last._id) }), 'utf8').toString('base64url')
      : null;

  sendAdminOk(res, {
    items: page.map((u) => mapListRow(u)),
    nextCursor,
  });
}

export async function getUserById(req: Request, res: Response): Promise<void> {
  const actor = req as StaffManagementRequest;
  const param = String((req.params as { id?: string }).id ?? '');
  const resolved = resolveManagementUserParam(param);
  if ('error' in resolved) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', resolved.error);
    return;
  }
  const targetId = resolved.objectId;
  if (env.FEATURE_ADMIN_REBAC) {
    const rebac = rebacAllows(actor, 'user:read', { type: 'user', id: targetId });
    if (!rebac.allow) {
      sendAdminError(res, 403, 'REBAC_DENIED', rebac.message);
      return;
    }
  }

  const user = await UserModel.findOne({
    _id: targetId,
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

  const profileUser = user as unknown as IUser & { _id: { toString(): string } };
  const emailVerification = resolveEmailVerificationForAdmin(profileUser);

  const [publishedBlogs, draftBlogs, subscription, ledgerCount, activity] = await Promise.all([
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
    loadAdminUserActivity(uid),
  ]);

  const userId = String(user._id);
  sendAdminOk(res, {
    user: {
      id: userId,
      ref: encodeAdminUserRef(userId),
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
      emailVerified: emailVerification.emailVerified,
      emailVerifiedEffective: emailVerification.emailVerifiedEffective,
      emailVerificationSource: emailVerification.emailVerificationSource,
      oauthProviderLabels: emailVerification.oauthProviderLabels,
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
      profileImg: user.profileImg ?? null,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      profileVersion: user.profileVersion ?? 0,
      staffRole: user.staffRole ?? null,
      accountType: user.staffRole?.trim() ? 'staff' : 'platform',
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
      updatedAt: user.updatedAt ? new Date(user.updatedAt as Date).toISOString() : null,
      oauth: toUserOAuthDto(profileUser),
      profile: toUserProfileDto(profileUser),
      blog: { published: publishedBlogs, drafts: draftBlogs },
      activity,
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

function resolveUserRouteParam(req: Request, res: Response): string | null {
  const param = String(req.params.id ?? '');
  const resolved = resolveManagementUserParam(param);
  if ('error' in resolved) {
    sendAdminError(res, 400, 'VALIDATION_ERROR', resolved.error);
    return null;
  }
  return resolved.objectId;
}

export async function getUserLedger(req: Request, res: Response): Promise<void> {
  const id = resolveUserRouteParam(req, res);
  if (!id) return;

  const limitRaw = (req.query.limit as string | undefined) ?? '20';
  const limit = Math.max(1, Math.min(Number.parseInt(limitRaw, 10) || 20, 50));
  const uid = new mongoose.Types.ObjectId(id);

  const rows = await PaymentLedgerModel.find({ userId: uid })
    .sort({ paidAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  sendAdminOk(res, {
    items: rows.map((r) => ({
      id: String(r._id),
      stripeInvoiceId: r.stripeInvoiceId,
      amountPaid: r.amountPaid,
      currency: r.currency,
      status: r.status,
      paidAt: r.paidAt ? new Date(r.paidAt).toISOString() : null,
      description: r.description ?? r.lineSummary ?? '',
      hostedInvoiceUrl: r.hostedInvoiceUrl ?? null,
      invoicePdfUrl: r.invoicePdfUrl ?? null,
    })),
  });
}

export async function getUserFollows(req: Request, res: Response): Promise<void> {
  const id = resolveUserRouteParam(req, res);
  if (!id) return;

  const type = (req.query.type as string | undefined)?.trim().toLowerCase();
  if (type !== 'followers' && type !== 'following') {
    sendAdminError(res, 400, 'VALIDATION_ERROR', 'type must be followers or following');
    return;
  }

  const limitRaw = (req.query.limit as string | undefined) ?? '50';
  const limit = Math.max(1, Math.min(Number.parseInt(limitRaw, 10) || 50, 100));
  const uid = new mongoose.Types.ObjectId(id);

  const filter =
    type === 'followers' ? { following: uid } : { follower: uid };
  const userField = type === 'followers' ? 'follower' : 'following';

  const links = await FollowModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  const userIds = links.map((l) => l[userField as 'follower' | 'following'] as mongoose.Types.ObjectId);
  const users =
    userIds.length > 0
      ? await UserModel.find({ _id: { $in: userIds }, isActive: true })
          .select('username fullName profileImg email')
          .lean()
      : [];
  const userById = new Map(users.map((u) => [String(u._id), u]));

  sendAdminOk(res, {
    type,
    items: links
      .map((link) => {
        const otherId = String(link[userField as 'follower' | 'following']);
        const u = userById.get(otherId);
        if (!u) return null;
        return {
          id: otherId,
          username: u.username,
          fullName: u.fullName,
          email: u.email,
          profileImg: normalizeProfileImg(u.profileImg),
          followedAt: link.createdAt ? new Date(link.createdAt).toISOString() : null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
  });
}

export async function patchUserProfile(req: Request, res: Response): Promise<void> {
  const id = resolveUserRouteParam(req, res);
  if (!id) return;

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
  const id = resolveUserRouteParam(req, res);
  if (!id) return;
  if (id === r.user._id) {
    sendAdminError(
      res,
      403,
      'FORBIDDEN',
      'Cannot change lock state on your own account from this API.'
    );
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
  const id = resolveUserRouteParam(req, res);
  if (!id) return;
  if (id === r.user._id) {
    sendAdminError(
      res,
      403,
      'FORBIDDEN',
      'Cannot change lock state on your own account from this API.'
    );
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
  const id = resolveUserRouteParam(req, res);
  if (!id) return;
  if (id === r.user._id) {
    sendAdminError(
      res,
      403,
      'FORBIDDEN',
      'Cannot revoke your own sessions via target user endpoint.'
    );
    return;
  }

  const result = await SessionModel.updateMany(
    { userId: id, revoked: false },
    { $set: { revoked: true } }
  );
  sendAdminOk(res, { revokedCount: result.modifiedCount });
}
