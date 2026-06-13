import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import {
  SquadModel,
  type ISquad,
  type SquadCategory,
  type SquadInvitePermission,
  type SquadPostPolicy,
  type SquadVisibility,
} from '../models/Squad.js';
import { SquadMemberModel, type SquadMemberRole } from '../models/SquadMember.js';
import { SquadSharedPostModel } from '../models/SquadSharedPost.js';
import { SquadPinnedPostModel } from '../models/SquadPinnedPost.js';
import { BlogPostModel } from '../models/BlogPost.js';
import { UserModel } from '../models/User.js';
import { sanitizeThumbnailUrl } from '../modules/blog/blogContentValidation.js';

export function squadSlugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replaceAll(/\s+/g, '-')
      .replaceAll(/[^\w-]/g, '')
      .replaceAll(/-+/g, '-')
      .replaceAll(/^-+/g, '')
      .replaceAll(/-+$/g, '')
      .slice(0, 40) || 'squad'
  );
}

/** Seed for `allocateUniqueSquadSlug` from the squad name only (ignore any client `handle`). */
export function squadHandleSeedFromName(name: string): string {
  const s = squadSlugify(name);
  if (s.length >= 2 && /[a-z0-9]/.test(s)) return s;
  return `squad-${randomBytes(4).toString('hex')}`.slice(0, 40);
}

function slugWithCollisionSuffix(base: string, attempt: number): string {
  if (attempt <= 0) return base.slice(0, 40);
  const suf = `-${attempt}`;
  const head = base.slice(0, Math.max(1, 40 - suf.length));
  return `${head}${suf}`;
}

/** Allocate a unique squad URL slug from a user-provided handle (normalized). */
export async function allocateUniqueSquadSlug(handleBase: string): Promise<string> {
  const base = squadSlugify(handleBase);
  for (let attempt = 0; attempt < 24; attempt++) {
    const cand = slugWithCollisionSuffix(base, attempt);
    const clash = await SquadModel.findOne({ slug: cand }).select('_id').lean();
    if (!clash) return cand;
  }
  return `${base}-${randomBytes(3).toString('hex')}`.slice(0, 40);
}

export function isStaffRole(role: SquadMemberRole): boolean {
  return role === 'admin' || role === 'moderator';
}

export async function getSquadMemberRole(
  squadId: mongoose.Types.ObjectId,
  userId: string
): Promise<SquadMemberRole | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const row = await SquadMemberModel.findOne({
    squadId,
    userId: new mongoose.Types.ObjectId(userId),
  })
    .select('role')
    .lean();
  return (row?.role as SquadMemberRole | undefined) ?? null;
}

export async function assertCanPostOrShareToSquad(params: {
  squadId: mongoose.Types.ObjectId;
  userId: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const squad = await SquadModel.findById(params.squadId).lean();
  if (!squad) return { ok: false, message: 'Squad not found', status: 404 };
  const role = await getSquadMemberRole(params.squadId, params.userId);
  if (!role)
    return { ok: false, message: 'Join this squad before posting or sharing here', status: 403 };
  if (squad.postPolicy === 'staff_only' && !isStaffRole(role)) {
    return {
      ok: false,
      message: 'Only admins and moderators can post or share in this squad',
      status: 403,
    };
  }
  return { ok: true };
}

export async function assertViewerCanSeeSquadFeed(params: {
  squad: Pick<ISquad, 'visibility' | '_id'>;
  userId: string | undefined;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  if (params.squad.visibility === 'public') return { ok: true };
  if (!params.userId) {
    return { ok: false, message: 'Sign in to view this private squad', status: 403 };
  }
  const role = await getSquadMemberRole(params.squad._id as mongoose.Types.ObjectId, params.userId);
  if (!role) return { ok: false, message: 'You are not a member of this squad', status: 403 };
  return { ok: true };
}

export type CreateSquadInput = {
  handle: string;
  name: string;
  description: string;
  iconUrl?: string;
  coverBannerUrl?: string;
  visibility: SquadVisibility;
  /** Required when visibility is public. */
  category?: SquadCategory;
  postPolicy: SquadPostPolicy;
  requirePostApproval: boolean;
  invitePermission: SquadInvitePermission;
  creatorUserId: string;
};

export async function createSquadWithAdmin(
  input: CreateSquadInput
): Promise<{ squad: ISquad; inviteToken?: string }> {
  const slug = await allocateUniqueSquadSlug(input.handle);
  const creatorOid = new mongoose.Types.ObjectId(input.creatorUserId);
  const inviteToken = input.visibility === 'private' ? randomBytes(18).toString('hex') : undefined;
  const icon = sanitizeThumbnailUrl(input.iconUrl);
  const cover = sanitizeThumbnailUrl(input.coverBannerUrl);

  const created = await SquadModel.create([
    {
      slug,
      name: input.name.trim().slice(0, 100),
      description: input.description.trim().slice(0, 500),
      ...(icon ? { iconUrl: icon } : {}),
      ...(cover ? { coverBannerUrl: cover } : {}),
      visibility: input.visibility,
      ...(input.visibility === 'public' && input.category ? { category: input.category } : {}),
      postPolicy: input.postPolicy,
      requirePostApproval: input.requirePostApproval === true,
      invitePermission: input.invitePermission,
      createdById: creatorOid,
      memberCount: 1,
      ...(inviteToken ? { inviteToken } : {}),
    },
  ]);
  const doc = Array.isArray(created) ? created[0]! : created;

  await SquadMemberModel.create([
    {
      squadId: doc._id as mongoose.Types.ObjectId,
      userId: creatorOid,
      role: 'admin' as const,
    },
  ]);

  const plain = doc.toObject() as ISquad & { inviteToken?: string };
  delete plain.inviteToken;
  return { squad: plain, inviteToken };
}

export async function joinPublicSquad(
  squadId: mongoose.Types.ObjectId,
  userId: string
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const squad = await SquadModel.findById(squadId).lean();
  if (!squad) return { ok: false, message: 'Squad not found', status: 404 };
  if (squad.visibility !== 'public') {
    return {
      ok: false,
      message: 'This squad is private—use an invite or ask an admin to add you',
      status: 403,
    };
  }
  const uid = new mongoose.Types.ObjectId(userId);
  try {
    await SquadMemberModel.create([{ squadId, userId: uid, role: 'member' as const }]);
    await SquadModel.updateOne({ _id: squadId }, { $inc: { memberCount: 1 } });
    return { ok: true };
  } catch (e) {
    const code = (e as { code?: number }).code;
    if (code === 11000) return { ok: false, message: 'Already a member', status: 409 };
    throw e;
  }
}

export async function joinPrivateSquadWithToken(params: {
  squadId: mongoose.Types.ObjectId;
  userId: string;
  inviteToken: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const squad = await SquadModel.findById(params.squadId).select('+inviteToken visibility').lean();
  if (!squad) return { ok: false, message: 'Squad not found', status: 404 };
  if (squad.visibility !== 'private') {
    return { ok: false, message: 'Use join for public squads', status: 400 };
  }
  const tok =
    typeof (squad as { inviteToken?: string }).inviteToken === 'string'
      ? (squad as { inviteToken?: string }).inviteToken
      : '';
  if (!tok || tok !== params.inviteToken.trim()) {
    return { ok: false, message: 'Invalid or missing invite code', status: 403 };
  }
  const uid = new mongoose.Types.ObjectId(params.userId);
  try {
    await SquadMemberModel.create([
      { squadId: params.squadId, userId: uid, role: 'member' as const },
    ]);
    await SquadModel.updateOne({ _id: params.squadId }, { $inc: { memberCount: 1 } });
    return { ok: true };
  } catch (e) {
    const code = (e as { code?: number }).code;
    if (code === 11000) return { ok: false, message: 'Already a member', status: 409 };
    throw e;
  }
}

export async function addSquadMemberByUsername(params: {
  squadId: mongoose.Types.ObjectId;
  actorUserId: string;
  targetUsername: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const squad = await SquadModel.findById(params.squadId).select('invitePermission').lean();
  if (!squad) return { ok: false, message: 'Squad not found', status: 404 };
  const actorRole = await getSquadMemberRole(params.squadId, params.actorUserId);
  if (!actorRole) {
    return { ok: false, message: 'You are not a member of this squad', status: 403 };
  }
  const perm =
    (squad as { invitePermission?: SquadInvitePermission }).invitePermission ?? 'all_members';
  if (perm === 'staff_only' && !isStaffRole(actorRole)) {
    return {
      ok: false,
      message: 'Only admins and moderators can add members to this squad',
      status: 403,
    };
  }
  const uname = params.targetUsername.trim().toLowerCase();
  if (!uname) return { ok: false, message: 'Username required', status: 400 };
  const user = await UserModel.findOne({ username: new RegExp(`^${escapeRegex(uname)}$`, 'i') })
    .select('_id')
    .lean();
  if (!user?._id) return { ok: false, message: 'User not found', status: 404 };
  try {
    await SquadMemberModel.create([
      {
        squadId: params.squadId,
        userId: user._id as mongoose.Types.ObjectId,
        role: 'member' as const,
      },
    ]);
    await SquadModel.updateOne({ _id: params.squadId }, { $inc: { memberCount: 1 } });
    return { ok: true };
  } catch (e) {
    const code = (e as { code?: number }).code;
    if (code === 11000) return { ok: false, message: 'User is already a member', status: 409 };
    throw e;
  }
}

function escapeRegex(s: string): string {
  return s.replaceAll(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}

export async function sharePostToSquad(params: {
  squadId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  userId: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const gate = await assertCanPostOrShareToSquad({
    squadId: params.squadId,
    userId: params.userId,
  });
  if (!gate.ok) return gate;

  const post = await BlogPostModel.findOne({
    _id: params.postId,
    status: 'published',
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  })
    .select('_id')
    .lean();
  if (!post) return { ok: false, message: 'Post not found or not shareable', status: 404 };

  try {
    await SquadSharedPostModel.create([
      {
        squadId: params.squadId,
        postId: params.postId,
        sharedById: new mongoose.Types.ObjectId(params.userId),
      },
    ]);
    return { ok: true };
  } catch (e) {
    const code = (e as { code?: number }).code;
    if (code === 11000)
      return { ok: false, message: 'This article is already in the squad feed', status: 409 };
    throw e;
  }
}

export async function setSquadMemberRole(params: {
  squadId: mongoose.Types.ObjectId;
  actorUserId: string;
  targetUsername: string;
  role: SquadMemberRole;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const actorRole = await getSquadMemberRole(params.squadId, params.actorUserId);
  if (!actorRole || actorRole !== 'admin') {
    return { ok: false, message: 'Only squad admins can change roles', status: 403 };
  }
  if (params.role === 'admin') {
    return { ok: false, message: 'Transferring admin is not supported yet', status: 400 };
  }
  const uname = params.targetUsername.trim().toLowerCase();
  const user = await UserModel.findOne({ username: new RegExp(`^${escapeRegex(uname)}$`, 'i') })
    .select('_id username')
    .lean();
  if (!user?._id) return { ok: false, message: 'User not found', status: 404 };

  const squad = await SquadModel.findById(params.squadId).select('createdById').lean();
  if (String(squad?.createdById) === String(user._id)) {
    return { ok: false, message: 'Cannot demote the squad creator', status: 400 };
  }

  const updated = await SquadMemberModel.findOneAndUpdate(
    { squadId: params.squadId, userId: user._id },
    { $set: { role: params.role } },
    { new: true }
  ).lean();
  if (!updated) return { ok: false, message: 'Member not found', status: 404 };
  return { ok: true };
}

export type SquadMemberPreview = { username: string; profileImg: string };

/** Up to four members per squad (oldest joins first) for directory cards. */
export async function getMemberPreviewsForSquads(
  squadIds: mongoose.Types.ObjectId[]
): Promise<Map<string, SquadMemberPreview[]>> {
  const out = new Map<string, SquadMemberPreview[]>();
  if (!squadIds.length) return out;

  const grouped = await SquadMemberModel.aggregate<{
    _id: mongoose.Types.ObjectId;
    userIds: mongoose.Types.ObjectId[];
  }>([
    { $match: { squadId: { $in: squadIds } } },
    { $sort: { createdAt: 1 } },
    { $group: { _id: '$squadId', userIds: { $push: '$userId' } } },
    { $project: { _id: 1, userIds: { $slice: ['$userIds', 4] } } },
  ]);

  const uniqueIds: mongoose.Types.ObjectId[] = [];
  const seen = new Set<string>();
  for (const g of grouped) {
    for (const id of g.userIds) {
      const k = String(id);
      if (!seen.has(k)) {
        seen.add(k);
        uniqueIds.push(id);
      }
    }
  }
  if (!uniqueIds.length) return out;

  const users = await UserModel.find({ _id: { $in: uniqueIds } })
    .select('username profileImg')
    .lean();
  const byUser = new Map(
    users.map((u) => [
      String(u._id),
      {
        username: typeof u.username === 'string' ? u.username : '',
        profileImg: typeof u.profileImg === 'string' ? u.profileImg : '',
      },
    ])
  );

  for (const g of grouped) {
    const sid = String(g._id);
    const previews: SquadMemberPreview[] = [];
    for (const uid of g.userIds) {
      const u = byUser.get(String(uid));
      if (u) previews.push(u);
    }
    out.set(sid, previews);
  }
  return out;
}

async function deleteSquadCascade(squadId: mongoose.Types.ObjectId): Promise<void> {
  await SquadPinnedPostModel.deleteMany({ squadId });
  await SquadSharedPostModel.deleteMany({ squadId });
  await SquadMemberModel.deleteMany({ squadId });
  await BlogPostModel.updateMany({ squadId }, { $unset: { squadId: 1 } });
  await SquadModel.deleteOne({ _id: squadId });
}

/** Post must be authored into the squad or shared into the squad feed. */
export async function assertPostInSquadFeed(params: {
  squadId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const shared = await SquadSharedPostModel.exists({
    squadId: params.squadId,
    postId: params.postId,
  });
  if (shared) return { ok: true };
  const authored = await BlogPostModel.exists({
    _id: params.postId,
    squadId: params.squadId,
    status: 'published',
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  });
  if (authored) return { ok: true };
  return { ok: false, message: 'This post is not in this squad feed', status: 400 };
}

export async function pinSquadFeedPost(params: {
  squadId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  actorUserId: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const role = await getSquadMemberRole(params.squadId, params.actorUserId);
  if (role !== 'admin') {
    return { ok: false, message: 'Only squad admins can pin posts', status: 403 };
  }
  const inFeed = await assertPostInSquadFeed({ squadId: params.squadId, postId: params.postId });
  if (!inFeed.ok) return inFeed;
  try {
    await SquadPinnedPostModel.create({
      squadId: params.squadId,
      postId: params.postId,
      pinnedById: new mongoose.Types.ObjectId(params.actorUserId),
    });
    return { ok: true };
  } catch (e) {
    const code = (e as { code?: number }).code;
    if (code === 11000) return { ok: false, message: 'This post is already pinned', status: 409 };
    throw e;
  }
}

export async function unpinSquadFeedPost(params: {
  squadId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  actorUserId: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const role = await getSquadMemberRole(params.squadId, params.actorUserId);
  if (role !== 'admin') {
    return { ok: false, message: 'Only squad admins can unpin posts', status: 403 };
  }
  const r = await SquadPinnedPostModel.deleteOne({
    squadId: params.squadId,
    postId: params.postId,
  });
  if (r.deletedCount === 0) return { ok: false, message: 'Pin not found', status: 404 };
  return { ok: true };
}

export async function listPinnedPostIdsForSquad(
  squadId: mongoose.Types.ObjectId
): Promise<Set<string>> {
  const rows = await SquadPinnedPostModel.find({ squadId }).select('postId').lean();
  return new Set(rows.map((r) => String((r as { postId: mongoose.Types.ObjectId }).postId)));
}

/** Member leaves; last member or empty squad triggers full delete. */
export async function leaveSquadAsMember(params: {
  squadId: mongoose.Types.ObjectId;
  userId: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const uid = new mongoose.Types.ObjectId(params.userId);
  const row = await SquadMemberModel.findOne({ squadId: params.squadId, userId: uid }).lean();
  if (!row) return { ok: false, message: 'You are not a member of this squad', status: 400 };

  if (row.role === 'admin') {
    const [adminCount, total] = await Promise.all([
      SquadMemberModel.countDocuments({ squadId: params.squadId, role: 'admin' }),
      SquadMemberModel.countDocuments({ squadId: params.squadId }),
    ]);
    if (adminCount === 1 && total > 1) {
      return {
        ok: false,
        message: 'Promote another admin before you leave this squad',
        status: 403,
      };
    }
  }

  await SquadMemberModel.deleteOne({ squadId: params.squadId, userId: uid });
  await SquadModel.updateOne({ _id: params.squadId }, { $inc: { memberCount: -1 } });

  const remaining = await SquadMemberModel.countDocuments({ squadId: params.squadId });
  if (remaining === 0) {
    await deleteSquadCascade(params.squadId);
  }
  return { ok: true };
}

export async function deleteSquadAsAdmin(params: {
  squadId: mongoose.Types.ObjectId;
  actorUserId: string;
}): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  const role = await getSquadMemberRole(params.squadId, params.actorUserId);
  if (role !== 'admin') {
    return { ok: false, message: 'Only squad admins can delete this squad', status: 403 };
  }
  await deleteSquadCascade(params.squadId);
  return { ok: true };
}
