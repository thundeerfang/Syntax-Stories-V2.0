import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import type { AuthUser } from '../middlewares/auth/index.js';
import type { RequestWithOptionalAuth } from '../middlewares/auth/optionalVerifyToken.js';
import {
  attachAchievementsToResponse,
  dispatchAchievementEvents,
} from '../achievements/achievement.service.js';
import { SquadModel } from '../models/Squad.js';
import { SquadMemberModel } from '../models/SquadMember.js';
import { UserModel } from '../models/User.js';
import { SquadSharedPostModel } from '../models/SquadSharedPost.js';
import { BlogPostModel } from '../models/BlogPost.js';
import { buildFeedListItemsForPosts } from './blog.controller.js';
import { NOT_DELETED_FILTER } from '../shared/db/notDeleted.js';
import {
  addSquadMemberByUsername,
  assertViewerCanSeeSquadFeed,
  createSquadWithAdmin,
  deleteSquadAsAdmin,
  getMemberPreviewsForSquads,
  getSquadMemberRole,
  joinPrivateSquadWithToken,
  joinPublicSquad,
  leaveSquadAsMember,
  setSquadMemberRole,
  sharePostToSquad,
  isStaffRole,
  listPinnedPostIdsForSquad,
  pinSquadFeedPost,
  unpinSquadFeedPost,
  getSquadMemberContribution,
  removeSquadMemberAsAdmin,
  getSquadFeedStats,
} from '../services/squad.service.js';
import type { SquadMemberRole } from '../models/SquadMember.js';
import {
  isSquadCategory,
  type SquadCategory,
  type SquadInvitePermission,
  type SquadPostPolicy,
  type SquadVisibility,
} from '../models/Squad.js';

function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseLimit(raw: string | undefined, fallback: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(max, Math.floor(n));
}

function mapSquadSummary(s: {
  _id: unknown;
  slug: string;
  name: string;
  description: string;
  iconUrl?: string;
  coverBannerUrl?: string;
  visibility: string;
  category?: string;
  postPolicy: string;
  requirePostApproval?: boolean;
  invitePermission?: string;
  memberCount: number;
  createdAt?: Date;
  createdById?: unknown;
}) {
  const visibility = s.visibility as SquadVisibility;
  const rawCat = (s as { category?: string }).category;
  const category: SquadCategory | undefined =
    visibility === 'public'
      ? isSquadCategory(String(rawCat ?? ''))
        ? (rawCat as SquadCategory)
        : 'web'
      : undefined;

  const cover = typeof s.coverBannerUrl === 'string' ? s.coverBannerUrl.trim() : '';
  return {
    _id: String(s._id),
    slug: s.slug,
    /** Public handle for display (`@{slug}`). */
    handle: s.slug,
    name: s.name,
    description: s.description,
    iconUrl: s.iconUrl,
    ...(cover ? { coverBannerUrl: cover } : {}),
    visibility: s.visibility,
    ...(category ? { category } : {}),
    postPolicy: s.postPolicy,
    requirePostApproval: (s as { requirePostApproval?: boolean }).requirePostApproval === true,
    invitePermission: ((s as { invitePermission?: string }).invitePermission ??
      'all_members') as SquadInvitePermission,
    memberCount: s.memberCount,
    createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : undefined,
    ...(s.createdById != null ? { creatorUserId: String(s.createdById) } : {}),
  };
}

/** GET /api/squads — public squads (paginated). */
export async function listPublicSquads(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseLimit(
      paramString(req.query.limit as string | string[] | undefined),
      24,
      100
    );
    const offset = parseLimit(
      paramString(req.query.offset as string | string[] | undefined),
      0,
      10_000
    );
    const [rows, total] = await Promise.all([
      SquadModel.find({ visibility: 'public' })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      SquadModel.countDocuments({ visibility: 'public' }),
    ]);
    const ids = rows.map((r) => r._id as mongoose.Types.ObjectId);
    const previews = await getMemberPreviewsForSquads(ids);
    res.status(200).json({
      success: true,
      squads: rows.map((s) => ({
        ...mapSquadSummary(s),
        memberPreview: previews.get(String(s._id)) ?? [],
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to list squads' });
  }
}

/** GET /api/squads/mine — squads the current user belongs to. */
export async function listMySquads(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const uid = new mongoose.Types.ObjectId(user._id);
    const links = await SquadMemberModel.find({ userId: uid }).select('squadId role').lean();
    const ids = links.map((l) => l.squadId as mongoose.Types.ObjectId);
    if (!ids.length) {
      res.status(200).json({ success: true, squads: [] });
      return;
    }
    const squads = await SquadModel.find({ _id: { $in: ids } })
      .sort({ updatedAt: -1 })
      .lean();
    const roleBy = new Map(links.map((l) => [String(l.squadId), l.role as SquadMemberRole]));
    const previews = await getMemberPreviewsForSquads(
      squads.map((s) => s._id as mongoose.Types.ObjectId)
    );
    res.status(200).json({
      success: true,
      squads: squads.map((s) => ({
        ...mapSquadSummary(s),
        viewerRole: roleBy.get(String(s._id)) ?? 'member',
        memberPreview: previews.get(String(s._id)) ?? [],
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load your squads' });
  }
}

/** GET /api/squads/u/:username — squads a user belongs to (public squads for guests; all if viewer is that user). */
export async function listSquadsForUser(req: Request, res: Response): Promise<void> {
  try {
    const username = paramString(req.params.username)?.trim().toLowerCase();
    if (!username) {
      res.status(400).json({ success: false, message: 'Invalid username' });
      return;
    }
    const profileUser = await UserModel.findOne({ username, isActive: true })
      .select('_id username')
      .lean();
    if (!profileUser?._id) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const r = req as RequestWithOptionalAuth;
    const viewerId = r.authUser?._id;
    const isSelf = viewerId != null && String(profileUser._id) === String(viewerId);

    const uid = profileUser._id as mongoose.Types.ObjectId;
    const links = await SquadMemberModel.find({ userId: uid }).select('squadId role').lean();
    const ids = links.map((l) => l.squadId as mongoose.Types.ObjectId);
    if (!ids.length) {
      res.status(200).json({ success: true, squads: [] });
      return;
    }

    const squadFilter: { _id: { $in: mongoose.Types.ObjectId[] }; visibility?: string } = {
      _id: { $in: ids },
    };
    if (!isSelf) {
      squadFilter.visibility = 'public';
    }

    const squads = await SquadModel.find(squadFilter).sort({ updatedAt: -1 }).lean();
    const roleBy = new Map(links.map((l) => [String(l.squadId), l.role as SquadMemberRole]));
    const previews = await getMemberPreviewsForSquads(
      squads.map((s) => s._id as mongoose.Types.ObjectId)
    );

    res.status(200).json({
      success: true,
      squads: squads.map((s) => {
        const base = {
          ...mapSquadSummary(s),
          memberPreview: previews.get(String(s._id)) ?? [],
        };
        if (isSelf) {
          return { ...base, viewerRole: roleBy.get(String(s._id)) ?? 'member' };
        }
        return base;
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load squads' });
  }
}

/** POST /api/squads — create squad (creator becomes admin). */
export async function createSquad(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const body = req.body as {
      name?: unknown;
      description?: unknown;
      iconUrl?: unknown;
      coverBannerUrl?: unknown;
      visibility?: unknown;
      postPolicy?: unknown;
      requirePostApproval?: unknown;
      invitePermission?: unknown;
      category?: unknown;
    };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!name || name.length > 100) {
      res.status(400).json({ success: false, message: 'Name is required (max 100 characters)' });
      return;
    }
    if (description.length > 500) {
      res
        .status(400)
        .json({ success: false, message: 'Description must be at most 500 characters' });
      return;
    }
    const visibility: SquadVisibility = body.visibility === 'private' ? 'private' : 'public';
    let category: SquadCategory | undefined;
    if (visibility === 'public') {
      const c = typeof body.category === 'string' ? body.category.trim() : '';
      if (!isSquadCategory(c)) {
        res.status(400).json({
          success: false,
          message: 'Public squads must include a valid category',
        });
        return;
      }
      category = c;
    }
    const postPolicy: SquadPostPolicy =
      body.postPolicy === 'staff_only' ? 'staff_only' : 'all_members';
    const invitePermission: SquadInvitePermission =
      body.invitePermission === 'staff_only' ? 'staff_only' : 'all_members';
    const requirePostApproval = body.requirePostApproval === true;
    const iconUrl = typeof body.iconUrl === 'string' ? body.iconUrl : undefined;
    const coverBannerUrl =
      typeof body.coverBannerUrl === 'string' ? body.coverBannerUrl : undefined;

    const { squad, inviteToken } = await createSquadWithAdmin({
      name,
      description,
      iconUrl,
      coverBannerUrl,
      visibility,
      category,
      postPolicy,
      requirePostApproval,
      invitePermission,
      creatorUserId: user._id,
    });

    res.status(201).json({
      success: true,
      squad: mapSquadSummary(squad),
      ...(inviteToken ? { inviteToken } : {}),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create squad' });
  }
}

/** GET /api/squads/s/:slug — squad profile + viewer context. */
export async function getSquadBySlug(req: Request, res: Response): Promise<void> {
  try {
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }
    const r = req as RequestWithOptionalAuth;
    const viewerId = r.authUser?._id;

    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }

    const squadOid = squad._id as mongoose.Types.ObjectId;
    const feedStats = await getSquadFeedStats(squadOid);

    const view = await assertViewerCanSeeSquadFeed({
      squad,
      userId: viewerId,
    });
    if (!view.ok) {
      if (squad.visibility === 'private') {
        res.status(200).json({
          success: true,
          squad: {
            ...mapSquadSummary(squad),
            postCount: feedStats.postCount,
            viewCount: feedStats.viewCount,
            viewerRole: null,
            viewerIsStaff: false,
            /** Client: show join UI; omit feed until member. */
            viewerNeedsInvite: true,
          },
        });
        return;
      }
      res.status(view.status).json({ success: false, message: view.message });
      return;
    }

    const viewerRole = viewerId ? await getSquadMemberRole(squadOid, viewerId) : null;
    let inviteTokenForAdmin: string | undefined;
    if (viewerRole === 'admin' && squad.visibility === 'private' && viewerId) {
      const t = await SquadModel.findById(squadOid).select('+inviteToken').lean();
      const tok =
        typeof (t as { inviteToken?: string })?.inviteToken === 'string'
          ? (t as { inviteToken: string }).inviteToken
          : undefined;
      inviteTokenForAdmin = tok;
    }

    res.status(200).json({
      success: true,
      squad: {
        ...mapSquadSummary(squad),
        postCount: feedStats.postCount,
        viewCount: feedStats.viewCount,
        viewerRole,
        viewerIsStaff: viewerRole ? isStaffRole(viewerRole) : false,
        viewerNeedsInvite: false,
        ...(inviteTokenForAdmin ? { inviteToken: inviteTokenForAdmin } : {}),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load squad' });
  }
}

/** POST /api/squads/s/:slug/leave */
export async function leaveSquad(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }
    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const r = await leaveSquadAsMember({
      squadId: squad._id as mongoose.Types.ObjectId,
      userId: user._id,
    });
    if (!r.ok) {
      res.status(r.status).json({ success: false, message: r.message });
      return;
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to leave squad' });
  }
}

/** DELETE /api/squads/s/:slug — admin only, removes squad and related data. */
export async function deleteSquad(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }
    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const r = await deleteSquadAsAdmin({
      squadId: squad._id as mongoose.Types.ObjectId,
      actorUserId: user._id,
    });
    if (!r.ok) {
      res.status(r.status).json({ success: false, message: r.message });
      return;
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete squad' });
  }
}

/** PATCH /api/squads/s/:slug — admin: partial update (banner, icon, details, rules). */
export async function patchSquad(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }
    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const role = await getSquadMemberRole(squad._id as mongoose.Types.ObjectId, user._id);
    if (role !== 'admin') {
      res.status(403).json({ success: false, message: 'Only squad admins can update the squad' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const setDoc: Record<string, unknown> = {};
    const unsetFields: string[] = [];

    const applyUrlField = (
      key: 'coverBannerUrl' | 'iconUrl',
      raw: unknown
    ): { ok: true } | { ok: false; status: number; message: string } => {
      if (raw === null || raw === '') {
        unsetFields.push(key);
        return { ok: true };
      }
      if (typeof raw !== 'string') {
        return { ok: false, status: 400, message: `${key} must be a string or null` };
      }
      const t = raw.trim();
      if (t.length > 2000) {
        return { ok: false, status: 400, message: `${key} is too long` };
      }
      if (!t) {
        unsetFields.push(key);
        return { ok: true };
      }
      setDoc[key] = t;
      return { ok: true };
    };

    if ('coverBannerUrl' in body) {
      const r = applyUrlField('coverBannerUrl', body.coverBannerUrl);
      if (!r.ok) {
        res.status(r.status).json({ success: false, message: r.message });
        return;
      }
    }
    if ('iconUrl' in body) {
      const r = applyUrlField('iconUrl', body.iconUrl);
      if (!r.ok) {
        res.status(r.status).json({ success: false, message: r.message });
        return;
      }
    }
    if ('name' in body) {
      const n = typeof body.name === 'string' ? body.name.trim() : '';
      if (!n || n.length > 100) {
        res.status(400).json({ success: false, message: 'name is required (max 100 characters)' });
        return;
      }
      setDoc.name = n;
    }
    if ('description' in body) {
      const d = typeof body.description === 'string' ? body.description.trim() : '';
      if (d.length > 500) {
        res.status(400).json({ success: false, message: 'description is too long' });
        return;
      }
      setDoc.description = d;
    }
    if ('postPolicy' in body) {
      const p = body.postPolicy;
      if (p !== 'all_members' && p !== 'staff_only') {
        res.status(400).json({ success: false, message: 'postPolicy is invalid' });
        return;
      }
      setDoc.postPolicy = p as SquadPostPolicy;
    }
    if ('requirePostApproval' in body) {
      if (typeof body.requirePostApproval !== 'boolean') {
        res.status(400).json({ success: false, message: 'requirePostApproval must be a boolean' });
        return;
      }
      setDoc.requirePostApproval = body.requirePostApproval;
    }
    if ('invitePermission' in body) {
      const ip = body.invitePermission;
      if (ip !== 'all_members' && ip !== 'staff_only') {
        res.status(400).json({ success: false, message: 'invitePermission is invalid' });
        return;
      }
      setDoc.invitePermission = ip as SquadInvitePermission;
    }
    if ('category' in body && squad.visibility === 'public') {
      const c = body.category;
      const cs = typeof c === 'string' ? c.trim() : '';
      if (!isSquadCategory(cs)) {
        res.status(400).json({ success: false, message: 'category is invalid' });
        return;
      }
      setDoc.category = cs as SquadCategory;
    }

    if (Object.keys(setDoc).length === 0 && unsetFields.length === 0) {
      res.status(400).json({ success: false, message: 'No updatable fields provided' });
      return;
    }

    const unsetDoc = Object.fromEntries(unsetFields.map((k) => [k, 1 as const]));
    const update: mongoose.mongo.UpdateFilter<typeof squad> =
      Object.keys(setDoc).length > 0 && unsetFields.length > 0
        ? { $set: setDoc, $unset: unsetDoc }
        : Object.keys(setDoc).length > 0
          ? { $set: setDoc }
          : { $unset: unsetDoc };

    await SquadModel.updateOne({ _id: squad._id }, update);
    const next = await SquadModel.findById(squad._id).lean();
    if (!next) {
      res.status(500).json({ success: false, message: 'Failed to reload squad' });
      return;
    }
    res.status(200).json({ success: true, squad: mapSquadSummary(next) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update squad' });
  }
}

/** POST /api/squads/s/:slug/join */
export async function joinSquad(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }
    const squad = await SquadModel.findOne({ slug }).select('+inviteToken visibility').lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const squadId = squad._id as mongoose.Types.ObjectId;
    if (squad.visibility === 'public') {
      const r = await joinPublicSquad(squadId, user._id);
      if (!r.ok) {
        res.status(r.status).json({ success: false, message: r.message });
        return;
      }
      const newlyUnlocked = await dispatchAchievementEvents(String(user._id), [{ type: 'profile_sync' }]);
      res.status(200).json(attachAchievementsToResponse({ success: true }, newlyUnlocked));
      return;
    }
    const body = req.body as { inviteToken?: unknown };
    const inviteToken = typeof body.inviteToken === 'string' ? body.inviteToken.trim() : '';
    if (!inviteToken) {
      res
        .status(400)
        .json({ success: false, message: 'inviteToken is required for private squads' });
      return;
    }
    const r = await joinPrivateSquadWithToken({ squadId, userId: user._id, inviteToken });
    if (!r.ok) {
      res.status(r.status).json({ success: false, message: r.message });
      return;
    }
    const newlyUnlocked = await dispatchAchievementEvents(String(user._id), [{ type: 'profile_sync' }]);
    res.status(200).json(attachAchievementsToResponse({ success: true }, newlyUnlocked));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to join squad' });
  }
}

/** POST /api/squads/s/:slug/members — admin adds a user by username. */
export async function postSquadMember(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }
    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const body = req.body as { username?: unknown };
    const username = typeof body.username === 'string' ? body.username : '';
    const r = await addSquadMemberByUsername({
      squadId: squad._id as mongoose.Types.ObjectId,
      actorUserId: user._id,
      targetUsername: username,
    });
    if (!r.ok) {
      res.status(r.status).json({ success: false, message: r.message });
      return;
    }
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add member' });
  }
}

/** PATCH /api/squads/s/:slug/members/role — admin sets moderator/member. */
export async function patchSquadMemberRole(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }
    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const body = req.body as { username?: unknown; role?: unknown };
    const username = typeof body.username === 'string' ? body.username : '';
    const roleRaw = body.role;
    const role =
      roleRaw === 'moderator' || roleRaw === 'member' ? (roleRaw as SquadMemberRole) : null;
    if (!role) {
      res.status(400).json({ success: false, message: 'role must be moderator or member' });
      return;
    }
    const r = await setSquadMemberRole({
      squadId: squad._id as mongoose.Types.ObjectId,
      actorUserId: user._id,
      targetUsername: username,
      role,
    });
    if (!r.ok) {
      res.status(r.status).json({ success: false, message: r.message });
      return;
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
}

/** GET /api/squads/s/:slug/members/:username/stats — squad contribution for a member. */
export async function getSquadMemberStats(req: Request, res: Response): Promise<void> {
  try {
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    const username = paramString(req.params.username)?.trim();
    if (!slug || !username) {
      res.status(400).json({ success: false, message: 'Invalid slug or username' });
      return;
    }
    const r = req as RequestWithOptionalAuth;
    const viewerId = r.authUser?._id;

    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const view = await assertViewerCanSeeSquadFeed({ squad, userId: viewerId });
    if (!view.ok) {
      res.status(view.status).json({ success: false, message: view.message });
      return;
    }

    const result = await getSquadMemberContribution({
      squadId: squad._id as mongoose.Types.ObjectId,
      username,
    });
    if (!result.ok) {
      res.status(result.status).json({ success: false, message: result.message });
      return;
    }
    res.status(200).json({ success: true, stats: result.stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load member stats' });
  }
}

/** DELETE /api/squads/s/:slug/members/:username — admin removes a member. */
export async function deleteSquadMember(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    const username = paramString(req.params.username)?.trim();
    if (!slug || !username) {
      res.status(400).json({ success: false, message: 'Invalid slug or username' });
      return;
    }
    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const r = await removeSquadMemberAsAdmin({
      squadId: squad._id as mongoose.Types.ObjectId,
      actorUserId: user._id,
      targetUsername: username,
    });
    if (!r.ok) {
      res.status(r.status).json({ success: false, message: r.message });
      return;
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
}

/** GET /api/squads/s/:slug/members */
export async function listSquadMembers(req: Request, res: Response): Promise<void> {
  try {
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }
    const r = req as RequestWithOptionalAuth;
    const viewerId = r.authUser?._id;

    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const view = await assertViewerCanSeeSquadFeed({ squad, userId: viewerId });
    if (!view.ok) {
      res.status(view.status).json({ success: false, message: view.message });
      return;
    }

    const squadId = squad._id as mongoose.Types.ObjectId;
    const rows = await SquadMemberModel.find({ squadId })
      .populate('userId', 'username fullName profileImg')
      .sort({ role: 1, createdAt: 1 })
      .lean();

    const order: Record<SquadMemberRole, number> = { admin: 0, moderator: 1, member: 2 };
    const members = rows
      .map((row) => {
        const populated = row.userId as unknown as {
          _id?: unknown;
          username?: string;
          fullName?: string;
          profileImg?: string;
        } | null;
        const userId =
          populated != null && populated._id != null ? String(populated._id) : String(row.userId);
        return {
          userId,
          username: typeof populated?.username === 'string' ? populated.username : '',
          fullName: typeof populated?.fullName === 'string' ? populated.fullName : '',
          profileImg: typeof populated?.profileImg === 'string' ? populated.profileImg : '',
          role: row.role as SquadMemberRole,
          joinedAt: row.createdAt?.toISOString?.() ?? undefined,
        };
      })
      .sort((a, b) => order[a.role] - order[b.role]);

    res.status(200).json({ success: true, members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to list members' });
  }
}

/** POST /api/squads/s/:slug/shares — share an existing published post into the squad feed. */
export async function postSquadShare(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }
    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const body = req.body as { postId?: unknown };
    const postIdStr = typeof body.postId === 'string' ? body.postId.trim() : '';
    if (!postIdStr || !mongoose.Types.ObjectId.isValid(postIdStr)) {
      res.status(400).json({ success: false, message: 'postId is required' });
      return;
    }
    const r = await sharePostToSquad({
      squadId: squad._id as mongoose.Types.ObjectId,
      postId: new mongoose.Types.ObjectId(postIdStr),
      userId: user._id,
    });
    if (!r.ok) {
      res.status(r.status).json({ success: false, message: r.message });
      return;
    }
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to share post' });
  }
}

/** POST /api/squads/s/:slug/pins — admin: pin a feed post for this squad. */
export async function postSquadPin(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }
    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const body = req.body as { postId?: unknown };
    const postIdStr = typeof body.postId === 'string' ? body.postId.trim() : '';
    if (!postIdStr || !mongoose.Types.ObjectId.isValid(postIdStr)) {
      res.status(400).json({ success: false, message: 'postId is required' });
      return;
    }
    const r = await pinSquadFeedPost({
      squadId: squad._id as mongoose.Types.ObjectId,
      postId: new mongoose.Types.ObjectId(postIdStr),
      actorUserId: user._id,
    });
    if (!r.ok) {
      res.status(r.status).json({ success: false, message: r.message });
      return;
    }
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to pin post' });
  }
}

/** DELETE /api/squads/s/:slug/pins/:postId — admin: unpin. */
export async function deleteSquadPin(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    const postIdParam = paramString(req.params.postId)?.trim();
    if (!slug || !postIdParam || !mongoose.Types.ObjectId.isValid(postIdParam)) {
      res.status(400).json({ success: false, message: 'Invalid path' });
      return;
    }
    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const r = await unpinSquadFeedPost({
      squadId: squad._id as mongoose.Types.ObjectId,
      postId: new mongoose.Types.ObjectId(postIdParam),
      actorUserId: user._id,
    });
    if (!r.ok) {
      res.status(r.status).json({ success: false, message: r.message });
      return;
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to unpin post' });
  }
}

/** GET /api/squads/s/:slug/feed */
export async function getSquadFeed(req: Request, res: Response): Promise<void> {
  try {
    const slug = paramString(req.params.slug)?.trim().toLowerCase();
    if (!slug) {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }
    const r = req as RequestWithOptionalAuth;
    const viewerId = r.authUser?._id;
    const limit = parseLimit(paramString(req.query.limit as string | string[] | undefined), 20, 40);

    const squad = await SquadModel.findOne({ slug }).lean();
    if (!squad) {
      res.status(404).json({ success: false, message: 'Squad not found' });
      return;
    }
    const view = await assertViewerCanSeeSquadFeed({ squad, userId: viewerId });
    if (!view.ok) {
      res.status(view.status).json({ success: false, message: view.message });
      return;
    }

    const squadOid = squad._id as mongoose.Types.ObjectId;

    const [authored, shares] = await Promise.all([
      BlogPostModel.find({
        squadId: squadOid,
        status: 'published',
        ...NOT_DELETED_FILTER,
      })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(limit)
        .populate({
          path: 'authorId',
          select: 'username fullName profileImg',
        })
        .populate({
          path: 'squadId',
          select: 'slug name iconUrl visibility coverBannerUrl memberCount',
          model: 'squads',
        })
        .lean(),
      SquadSharedPostModel.find({ squadId: squadOid })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate({
          path: 'postId',
          populate: [
            { path: 'authorId', select: 'username fullName profileImg' },
            {
              path: 'squadId',
              select: 'slug name iconUrl visibility coverBannerUrl memberCount',
              model: 'squads',
            },
          ],
        })
        .populate({
          path: 'sharedById',
          select: 'username fullName profileImg',
          model: 'users',
        })
        .lean(),
    ]);

    type FeedSharedBy = {
      userId: string;
      username: string;
      fullName?: string;
      profileImg?: string;
    };

    type FeedRow = {
      kind: 'authored' | 'shared';
      sortAt: number;
      post: unknown;
      sharedAt?: string;
      sharedById?: string;
      sharedBy?: FeedSharedBy;
    };

    const rows: FeedRow[] = [];

    for (const p of authored) {
      const pub =
        (p as { publishedAt?: Date }).publishedAt ?? (p as { createdAt?: Date }).createdAt;
      const t = pub instanceof Date ? pub.getTime() : 0;
      rows.push({ kind: 'authored', sortAt: t, post: p });
    }

    for (const s of shares) {
      const sp = s.postId as unknown;
      if (!sp || typeof sp !== 'object') continue;
      const created = s.createdAt instanceof Date ? s.createdAt.getTime() : 0;
      const sharerRaw = s.sharedById as
        | { _id?: unknown; username?: string; fullName?: string; profileImg?: string }
        | null
        | undefined;
      const sharerId =
        sharerRaw && typeof sharerRaw === 'object' && sharerRaw._id != null
          ? String(sharerRaw._id)
          : String(s.sharedById);
      const username =
        sharerRaw && typeof sharerRaw === 'object' && typeof sharerRaw.username === 'string'
          ? sharerRaw.username.trim()
          : '';
      rows.push({
        kind: 'shared',
        sortAt: created,
        post: sp,
        sharedAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : undefined,
        sharedById: sharerId,
        ...(username
          ? {
              sharedBy: {
                userId: sharerId,
                username,
                ...(typeof sharerRaw?.fullName === 'string' && sharerRaw.fullName.trim()
                  ? { fullName: sharerRaw.fullName.trim() }
                  : {}),
                ...(typeof sharerRaw?.profileImg === 'string' && sharerRaw.profileImg.trim()
                  ? { profileImg: sharerRaw.profileImg.trim() }
                  : {}),
              } satisfies FeedSharedBy,
            }
          : {}),
      });
    }

    rows.sort((a, b) => b.sortAt - a.sortAt);
    const sliced = rows.slice(0, limit);
    const postDocs = sliced.map((x) => x.post);
    const items = await buildFeedListItemsForPosts(req, postDocs);

    const pinnedIds = await listPinnedPostIdsForSquad(squadOid);
    const pinnedCount = pinnedIds.size;

    const out = sliced.map((row, i) => ({
      kind: row.kind,
      item: items[i],
      sharedAt: row.sharedAt,
      sharedById: row.sharedById,
      sharedBy: row.sharedBy,
      pinned: pinnedIds.has(String(items[i]._id)),
    }));

    res.status(200).json({ success: true, feed: out, pinnedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load squad feed' });
  }
}
