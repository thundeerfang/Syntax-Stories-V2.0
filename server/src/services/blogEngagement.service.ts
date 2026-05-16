import mongoose from 'mongoose';
import { BlogBookmarkModel } from '../models/BlogBookmark.js';
import { BlogPostModel } from '../models/BlogPost.js';
import { BlogRepostModel } from '../models/BlogRepost.js';
import { resolveBookmarkGroupForViewer } from './bookmarkGroups.service.js';

const NOT_DELETED: { $or: Array<{ deletedAt: null } | { deletedAt: { $exists: boolean } }> } = {
  $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
};

export type SetRepostResult =
  | { ok: true; reposting: boolean; repostCount: number }
  | { ok: false; code: 'NOT_FOUND' | 'NOT_ELIGIBLE' };

export type SetBookmarkResult =
  | { ok: true; bookmarked: boolean; bookmarkCount: number }
  | { ok: false; code: 'NOT_FOUND' | 'NOT_ELIGIBLE' };

/**
 * Repost: authors cannot repost their own post (parity with Respect).
 * Bookmark: authors may save their own post.
 */
export async function setRepostDesiredState(params: {
  viewerUserId: string;
  postId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  reposting: boolean;
}): Promise<SetRepostResult> {
  const viewerOid = new mongoose.Types.ObjectId(params.viewerUserId);
  if (viewerOid.equals(params.authorId)) {
    const edge = await BlogRepostModel.findOne({ userId: viewerOid, postId: params.postId }).select('_id').lean();
    const post = await BlogPostModel.findById(params.postId).select('repostCount').lean();
    const count = Math.max(0, post?.repostCount ?? 0);
    return { ok: true, reposting: !!edge, repostCount: count };
  }

  const postCheck = await BlogPostModel.findOne({
    _id: params.postId,
    status: 'published',
    ...NOT_DELETED,
  })
    .select('authorId')
    .lean();
  if (!postCheck) {
    return { ok: false, code: 'NOT_ELIGIBLE' };
  }
  if (!(postCheck.authorId as mongoose.Types.ObjectId).equals(params.authorId)) {
    return { ok: false, code: 'NOT_ELIGIBLE' };
  }

  const session = await mongoose.startSession();
  try {
    let reposting = false;
    let repostCount = 0;

    await session.withTransaction(async () => {
      const existing = await BlogRepostModel.findOne({
        userId: viewerOid,
        postId: params.postId,
      }).session(session);

      if (params.reposting) {
        if (!existing) {
          try {
            await BlogRepostModel.create([{ userId: viewerOid, postId: params.postId }], { session });
          } catch (e) {
            const err = e as { code?: number };
            if (err?.code !== 11000) throw e;
          }
          await BlogPostModel.updateOne({ _id: params.postId }, { $inc: { repostCount: 1 } }, { session });
        }
      } else if (existing) {
        await BlogRepostModel.deleteOne({ _id: existing._id }).session(session);
        await BlogPostModel.updateOne(
          { _id: params.postId, repostCount: { $gt: 0 } },
          { $inc: { repostCount: -1 } },
          { session }
        );
      }

      const edgeAfter = await BlogRepostModel.findOne({ userId: viewerOid, postId: params.postId })
        .session(session)
        .select('_id')
        .lean();
      reposting = !!edgeAfter;

      const p = await BlogPostModel.findById(params.postId).session(session).select('repostCount').lean();
      repostCount = Math.max(0, p?.repostCount ?? 0);
    });

    return { ok: true, reposting, repostCount };
  } finally {
    await session.endSession();
  }
}

export async function setBookmarkDesiredState(params: {
  viewerUserId: string;
  postId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  bookmarked: boolean;
  /** When saving, assign to this folder (must belong to viewer); otherwise default group. */
  groupIdHex?: string | null;
}): Promise<SetBookmarkResult> {
  const viewerOid = new mongoose.Types.ObjectId(params.viewerUserId);

  const postCheck = await BlogPostModel.findOne({
    _id: params.postId,
    status: 'published',
    ...NOT_DELETED,
  })
    .select('authorId')
    .lean();
  if (!postCheck) {
    return { ok: false, code: 'NOT_ELIGIBLE' };
  }
  if (!(postCheck.authorId as mongoose.Types.ObjectId).equals(params.authorId)) {
    return { ok: false, code: 'NOT_ELIGIBLE' };
  }

  let targetGroupId: mongoose.Types.ObjectId | null = null;
  if (params.bookmarked) {
    targetGroupId = await resolveBookmarkGroupForViewer(params.viewerUserId, params.groupIdHex ?? null);
  }

  const session = await mongoose.startSession();
  try {
    let bookmarked = false;
    let bookmarkCount = 0;

    await session.withTransaction(async () => {
      const existing = await BlogBookmarkModel.findOne({
        userId: viewerOid,
        postId: params.postId,
      }).session(session);

      if (params.bookmarked) {
        if (!existing) {
          try {
            await BlogBookmarkModel.create(
              [{ userId: viewerOid, postId: params.postId, groupId: targetGroupId! }],
              { session },
            );
            await BlogPostModel.updateOne({ _id: params.postId }, { $inc: { bookmarkCount: 1 } }, { session });
          } catch (e) {
            const err = e as { code?: number };
            if (err?.code !== 11000) throw e;
            const raced = await BlogBookmarkModel.findOne({ userId: viewerOid, postId: params.postId }).session(session);
            if (raced && targetGroupId && String(raced.groupId ?? '') !== String(targetGroupId)) {
              await BlogBookmarkModel.updateOne(
                { _id: raced._id },
                { $set: { groupId: targetGroupId } },
                { session },
              );
            }
          }
        } else if (targetGroupId && String(existing.groupId ?? '') !== String(targetGroupId)) {
          await BlogBookmarkModel.updateOne(
            { _id: existing._id },
            { $set: { groupId: targetGroupId } },
            { session },
          );
        }
      } else if (existing) {
        await BlogBookmarkModel.deleteOne({ _id: existing._id }).session(session);
        await BlogPostModel.updateOne(
          { _id: params.postId, bookmarkCount: { $gt: 0 } },
          { $inc: { bookmarkCount: -1 } },
          { session },
        );
      }

      const edgeAfter = await BlogBookmarkModel.findOne({ userId: viewerOid, postId: params.postId })
        .session(session)
        .select('_id')
        .lean();
      bookmarked = !!edgeAfter;

      const p = await BlogPostModel.findById(params.postId).session(session).select('bookmarkCount').lean();
      bookmarkCount = Math.max(0, p?.bookmarkCount ?? 0);
    });

    return { ok: true, bookmarked, bookmarkCount };
  } finally {
    await session.endSession();
  }
}

export async function viewerRepostStatesForPosts(
  viewerUserId: string,
  postIds: string[]
): Promise<Record<string, boolean>> {
  const oids: mongoose.Types.ObjectId[] = [];
  const idByHex = new Map<string, string>();
  for (const id of postIds) {
    if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id) {
      const oid = new mongoose.Types.ObjectId(id);
      oids.push(oid);
      idByHex.set(oid.toHexString(), id);
    }
  }
  const out: Record<string, boolean> = {};
  if (!oids.length) return out;
  const viewerOid = new mongoose.Types.ObjectId(viewerUserId);
  const rows = await BlogRepostModel.find({ userId: viewerOid, postId: { $in: oids } }).select('postId').lean();
  for (const oid of oids) {
    out[idByHex.get(oid.toHexString()) ?? String(oid)] = false;
  }
  for (const r of rows) {
    const hex = (r.postId as mongoose.Types.ObjectId).toHexString();
    const key = idByHex.get(hex);
    if (key) out[key] = true;
  }
  return out;
}

export async function viewerBookmarkStatesForPosts(
  viewerUserId: string,
  postIds: string[]
): Promise<Record<string, boolean>> {
  const oids: mongoose.Types.ObjectId[] = [];
  const idByHex = new Map<string, string>();
  for (const id of postIds) {
    if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id) {
      const oid = new mongoose.Types.ObjectId(id);
      oids.push(oid);
      idByHex.set(oid.toHexString(), id);
    }
  }
  const out: Record<string, boolean> = {};
  if (!oids.length) return out;
  const viewerOid = new mongoose.Types.ObjectId(viewerUserId);
  const rows = await BlogBookmarkModel.find({ userId: viewerOid, postId: { $in: oids } }).select('postId').lean();
  for (const oid of oids) {
    out[idByHex.get(oid.toHexString()) ?? String(oid)] = false;
  }
  for (const r of rows) {
    const hex = (r.postId as mongoose.Types.ObjectId).toHexString();
    const key = idByHex.get(hex);
    if (key) out[key] = true;
  }
  return out;
}

/** When a post is no longer publicly eligible, zero repost/bookmark counters (edges kept for restore). */
export async function suspendRepostBookmarkContributionsForPost(postId: mongoose.Types.ObjectId): Promise<void> {
  await BlogPostModel.updateOne({ _id: postId }, { $set: { repostCount: 0, bookmarkCount: 0 } });
}

export async function resumeRepostBookmarkContributionsForPost(postId: mongoose.Types.ObjectId): Promise<void> {
  const [repostCount, bookmarkCount] = await Promise.all([
    BlogRepostModel.countDocuments({ postId }),
    BlogBookmarkModel.countDocuments({ postId }),
  ]);
  await BlogPostModel.updateOne(
    { _id: postId },
    { $set: { repostCount: Math.max(0, repostCount), bookmarkCount: Math.max(0, bookmarkCount) } }
  );
}

export async function deleteAllRepostsForPost(postId: mongoose.Types.ObjectId): Promise<void> {
  await BlogRepostModel.deleteMany({ postId });
}

export async function deleteAllBookmarksForPost(postId: mongoose.Types.ObjectId): Promise<void> {
  await BlogBookmarkModel.deleteMany({ postId });
}
