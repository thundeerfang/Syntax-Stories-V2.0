import { Request, Response } from 'express';
import mongoose from 'mongoose';
import type { AuthUser } from '../middlewares/auth/index.js';
import { BlogPostModel } from '../models/BlogPost.js';
import { BlogRepostModel } from '../models/BlogRepost.js';
import { buildFeedListItemsForPosts } from '../controllers/blog.controller.js';

/** Active rows are not soft-deleted (`deletedAt` unset or null). */
const NOT_DELETED: { $or: Array<{ deletedAt: null } | { deletedAt: { $exists: boolean } }> } = {
  $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
};

/** GET /api/reposts/posts?q=&sort=newest|oldest&limit= */
export async function listRepostedPosts(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const userOid = new mongoose.Types.ObjectId(user._id);

    const rawLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(80, Math.max(1, rawLimit)) : 48;
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const sortRaw = typeof req.query.sort === 'string' ? req.query.sort.trim().toLowerCase() : '';
    const oldestFirst = sortRaw === 'oldest';

    const reposts = await BlogRepostModel.find({ userId: userOid })
      .sort({ createdAt: oldestFirst ? 1 : -1 })
      .limit(200)
      .select('postId createdAt')
      .lean();

    const postIds = reposts.map((r) => r.postId as mongoose.Types.ObjectId);
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
    for (const r of reposts) {
      const doc = postById.get(String(r.postId));
      if (doc) orderedDocs.push(doc);
    }

    let feedItems = await buildFeedListItemsForPosts(req, orderedDocs);

    if (q.length > 0) {
      feedItems = feedItems.filter((it) => {
        const hay = `${it.title} ${it.summary ?? ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    res.status(200).json({
      success: true,
      posts: feedItems.slice(0, limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load reposts' });
  }
}
