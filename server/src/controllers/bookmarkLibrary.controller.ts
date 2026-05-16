import { Request, Response } from 'express';
import mongoose from 'mongoose';
import type { AuthUser } from '../middlewares/auth/index.js';
import { BlogPostModel } from '../models/BlogPost.js';
import { BlogBookmarkModel } from '../models/BlogBookmark.js';
import { buildFeedListItemsForPosts } from '../controllers/blog.controller.js';
import {
  createGroupForUser,
  deleteGroupForUser,
  ensureDefaultBookmarkGroup,
  listGroupsForUser,
  setDefaultGroupForUser,
} from '../services/bookmarkGroups.service.js';

function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}

/** Active rows are not soft-deleted (`deletedAt` unset or null). */
const NOT_DELETED: { $or: Array<{ deletedAt: null } | { deletedAt: { $exists: boolean } }> } = {
  $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
};

/** GET /api/bookmarks/groups */
export async function listBookmarkGroups(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const userOid = new mongoose.Types.ObjectId(user._id);
    const rows = await listGroupsForUser(userOid);
    const defaultRow = rows.find((g) => g.isDefault);
    const defaultIdStr = defaultRow ? String(defaultRow._id) : null;

    const agg = await BlogBookmarkModel.aggregate<{ _id: mongoose.Types.ObjectId | null; c: number }>([
      { $match: { userId: userOid } },
      { $group: { _id: '$groupId', c: { $sum: 1 } } },
    ]);
    const countByGroup = new Map<string, number>();
    for (const row of agg) {
      const key = row._id ? String(row._id) : defaultIdStr;
      if (!key) continue;
      countByGroup.set(key, (countByGroup.get(key) ?? 0) + row.c);
    }

    res.status(200).json({
      success: true,
      groups: rows.map((g) => ({
        _id: String(g._id),
        name: g.name,
        emoji: typeof (g as { emoji?: string }).emoji === 'string' ? (g as { emoji?: string }).emoji : '',
        isDefault: !!g.isDefault,
        bookmarkCount: countByGroup.get(String(g._id)) ?? 0,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load groups' });
  }
}

/** POST /api/bookmarks/groups — body `{ name: string }` */
export async function createBookmarkGroup(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const body = req.body as { name?: unknown; emoji?: unknown; makeDefault?: unknown };
    const name = typeof body.name === 'string' ? body.name : '';
    const emoji = typeof body.emoji === 'string' ? body.emoji : '';
    const makeDefault = body.makeDefault === true;
    const userOid = new mongoose.Types.ObjectId(user._id);
    const r = await createGroupForUser(userOid, name, { emoji, makeDefault });
    if (!r.ok) {
      res.status(400).json({ success: false, message: r.message ?? 'Invalid' });
      return;
    }
    res.status(201).json({ success: true, group: r.group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create group' });
  }
}

/** PATCH /api/bookmarks/groups/:groupId — body `{ isDefault?: boolean }` */
export async function patchBookmarkGroup(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const gid = paramString(req.params.groupId);
    if (!gid?.trim()) {
      res.status(400).json({ success: false, message: 'Invalid group' });
      return;
    }
    const body = req.body as { isDefault?: unknown };
    const userOid = new mongoose.Types.ObjectId(user._id);
    if (body.isDefault === true) {
      const r = await setDefaultGroupForUser(userOid, gid.trim());
      if (!r.ok) {
        res.status(400).json({ success: false, message: r.message ?? 'Failed' });
        return;
      }
      res.status(200).json({ success: true });
      return;
    }
    res.status(400).json({ success: false, message: 'Only isDefault: true is supported' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update group' });
  }
}

/** DELETE /api/bookmarks/groups/:groupId */
export async function removeBookmarkGroup(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const gid = paramString(req.params.groupId);
    if (!gid?.trim()) {
      res.status(400).json({ success: false, message: 'Invalid group' });
      return;
    }
    const userOid = new mongoose.Types.ObjectId(user._id);
    const r = await deleteGroupForUser(userOid, gid.trim());
    if (!r.ok) {
      res.status(400).json({ success: false, message: r.message ?? 'Failed' });
      return;
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete group' });
  }
}

/** GET /api/bookmarks/posts?groupId=&q=&sort=newest|oldest */
export async function listBookmarkedPosts(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const userOid = new mongoose.Types.ObjectId(user._id);
    await ensureDefaultBookmarkGroup(userOid);

    const rawLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(80, Math.max(1, rawLimit)) : 48;
    const groupFilter = typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

    const bookmarkQuery: Record<string, unknown> = { userId: userOid };
    if (groupFilter && groupFilter !== 'all') {
      if (!mongoose.Types.ObjectId.isValid(groupFilter)) {
        res.status(400).json({ success: false, message: 'Invalid groupId' });
        return;
      }
      bookmarkQuery.groupId = new mongoose.Types.ObjectId(groupFilter);
    }

    const sortRaw = typeof req.query.sort === 'string' ? req.query.sort.trim().toLowerCase() : '';
    const oldestFirst = sortRaw === 'oldest';

    const bookmarks = await BlogBookmarkModel.find(bookmarkQuery)
      .sort({ createdAt: oldestFirst ? 1 : -1 })
      .limit(200)
      .select('postId groupId createdAt')
      .lean();

    const postIds = bookmarks.map((b) => b.postId as mongoose.Types.ObjectId);
    if (!postIds.length) {
      res.status(200).json({ success: true, posts: [] });
      return;
    }

    const postsRaw = await BlogPostModel.find({
      _id: { $in: postIds },
      status: 'published',
      ...NOT_DELETED,
    })
      .populate({ path: 'authorId', select: 'username fullName profileImg', model: 'users' })
      .populate({ path: 'lastEditedById', select: 'username fullName', model: 'users' })
      .populate({
        path: 'squadId',
        select: 'slug name iconUrl visibility coverBannerUrl memberCount',
        model: 'squads',
      })
      .lean();

    const postById = new Map<string, (typeof postsRaw)[0]>();
    for (const p of postsRaw) postById.set(String(p._id), p);

    const orderedDocs: unknown[] = [];
    for (const b of bookmarks) {
      const pid = String(b.postId);
      const doc = postById.get(pid);
      if (doc) orderedDocs.push(doc);
    }

    let feedItems = await buildFeedListItemsForPosts(req, orderedDocs);

    if (q.length > 0) {
      feedItems = feedItems.filter((it) => it.title.toLowerCase().includes(q));
    }

    res.status(200).json({
      success: true,
      posts: feedItems.slice(0, limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load bookmarks' });
  }
}
