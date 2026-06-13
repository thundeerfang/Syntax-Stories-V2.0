import mongoose from 'mongoose';
import { BlogPostModel } from '../models/BlogPost.js';
import { BlogRespectModel } from '../models/BlogRespect.js';
import { UserModel } from '../models/User.js';
import { NOT_DELETED_FILTER } from '../shared/db/notDeleted.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function findEligiblePublishedPostByUsernameSlug(
  username: string,
  slug: string
): Promise<{
  postId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  respectCount: number;
} | null> {
  const user = await UserModel.findOne({
    username: new RegExp(`^${escapeRegex(username.trim())}$`, 'i'),
  })
    .select('_id')
    .lean();
  if (!user?._id) return null;
  const post = await BlogPostModel.findOne({
    authorId: user._id,
    slug: slug.trim(),
    status: 'published',
    ...NOT_DELETED_FILTER,
  })
    .select('_id authorId respectCount')
    .lean();
  if (!post?._id) return null;
  const rc =
    typeof (post as { respectCount?: number }).respectCount === 'number'
      ? Math.max(0, (post as { respectCount: number }).respectCount)
      : 0;
  return {
    postId: post._id as mongoose.Types.ObjectId,
    authorId: post.authorId as mongoose.Types.ObjectId,
    respectCount: rc,
  };
}

/** When a post stops contributing to public Respect (draft or soft-delete), zero its count and adjust author aggregate. Edges remain for restore. */
export async function suspendRespectContributionsForPost(
  postId: mongoose.Types.ObjectId,
  authorId: mongoose.Types.ObjectId
): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const doc = await BlogPostModel.findById(postId)
        .session(session)
        .select('respectCount')
        .lean();
      const n = Math.max(0, doc?.respectCount ?? 0);
      if (n === 0) {
        await BlogPostModel.updateOne({ _id: postId }, { $set: { respectCount: 0 } }, { session });
        return;
      }
      const author = await UserModel.findById(authorId)
        .session(session)
        .select('blogRespectReceivedCount')
        .lean();
      const cur = Math.max(0, author?.blogRespectReceivedCount ?? 0);
      const nextAuthor = Math.max(0, cur - n);
      await UserModel.updateOne(
        { _id: authorId },
        { $set: { blogRespectReceivedCount: nextAuthor } },
        { session }
      );
      await BlogPostModel.updateOne({ _id: postId }, { $set: { respectCount: 0 } }, { session });
    });
  } finally {
    await session.endSession();
  }
}

/** After restore to published+active, re-derive post respectCount from edges and credit author. */
export async function resumeRespectContributionsForPost(
  postId: mongoose.Types.ObjectId,
  authorId: mongoose.Types.ObjectId
): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const count = await BlogRespectModel.countDocuments({ postId }).session(session);
      const m = Math.max(0, count);
      await BlogPostModel.updateOne({ _id: postId }, { $set: { respectCount: m } }, { session });
      if (m === 0) return;
      await UserModel.updateOne(
        { _id: authorId },
        { $inc: { blogRespectReceivedCount: m } },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}

export type SetRespectResult =
  | {
      ok: true;
      respecting: boolean;
      respectCount: number;
      authorBlogRespectReceivedCount: number;
      newRespectEdge: boolean;
    }
  | { ok: false; code: 'NOT_FOUND' | 'NOT_ELIGIBLE' };

/**
 * Apply explicit desired Respect state in one transaction (edge + denormalized counters).
 */
export async function setRespectDesiredState(params: {
  viewerUserId: string;
  postId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  respecting: boolean;
}): Promise<SetRespectResult> {
  const viewerOid = new mongoose.Types.ObjectId(params.viewerUserId);
  if (viewerOid.equals(params.authorId)) {
    const edge = await BlogRespectModel.findOne({ userId: viewerOid, postId: params.postId })
      .select('_id')
      .lean();
    const post = await BlogPostModel.findById(params.postId).select('respectCount').lean();
    const count = Math.max(0, post?.respectCount ?? 0);
    const author = await UserModel.findById(params.authorId)
      .select('blogRespectReceivedCount')
      .lean();
    const authorTotal = Math.max(0, author?.blogRespectReceivedCount ?? 0);
    return {
      ok: true,
      respecting: !!edge,
      respectCount: count,
      authorBlogRespectReceivedCount: authorTotal,
      newRespectEdge: false,
    };
  }

  const postCheck = await BlogPostModel.findOne({
    _id: params.postId,
    status: 'published',
    ...NOT_DELETED_FILTER,
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
    let respecting = false;
    let respectCount = 0;
    let authorBlogRespectReceivedCount = 0;
    let newRespectEdge = false;

    await session.withTransaction(async () => {
      const existing = await BlogRespectModel.findOne({
        userId: viewerOid,
        postId: params.postId,
      }).session(session);

      if (params.respecting) {
        if (!existing) {
          try {
            await BlogRespectModel.create([{ userId: viewerOid, postId: params.postId }], {
              session,
            });
            newRespectEdge = true;
          } catch (e) {
            const err = e as { code?: number };
            if (err?.code !== 11000) throw e;
          }
          await BlogPostModel.updateOne(
            { _id: params.postId },
            { $inc: { respectCount: 1 } },
            { session }
          );
          await UserModel.updateOne(
            { _id: params.authorId },
            { $inc: { blogRespectReceivedCount: 1 } },
            { session }
          );
        }
      } else if (existing) {
        await BlogRespectModel.deleteOne({ _id: existing._id }).session(session);
        await BlogPostModel.updateOne(
          { _id: params.postId, respectCount: { $gt: 0 } },
          { $inc: { respectCount: -1 } },
          { session }
        );
        await UserModel.updateOne(
          { _id: params.authorId, blogRespectReceivedCount: { $gt: 0 } },
          { $inc: { blogRespectReceivedCount: -1 } },
          { session }
        );
      }

      const edgeAfter = await BlogRespectModel.findOne({
        userId: viewerOid,
        postId: params.postId,
      })
        .session(session)
        .select('_id')
        .lean();
      respecting = !!edgeAfter;

      const p = await BlogPostModel.findById(params.postId)
        .session(session)
        .select('respectCount')
        .lean();
      respectCount = Math.max(0, p?.respectCount ?? 0);
      const a = await UserModel.findById(params.authorId)
        .session(session)
        .select('blogRespectReceivedCount')
        .lean();
      authorBlogRespectReceivedCount = Math.max(0, a?.blogRespectReceivedCount ?? 0);
    });

    return { ok: true, respecting, respectCount, authorBlogRespectReceivedCount, newRespectEdge };
  } finally {
    await session.endSession();
  }
}

/** Map post id string -> viewer is respecting (only for valid ObjectIds). */
export async function viewerRespectStatesForPosts(
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
  const rows = await BlogRespectModel.find({ userId: viewerOid, postId: { $in: oids } })
    .select('postId')
    .lean();
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

export function normalizeRespectCount(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  return 0;
}

/** Hard-delete all Respect edges for a post (e.g. permanent purge). */
export async function deleteAllRespectsForPost(postId: mongoose.Types.ObjectId): Promise<void> {
  await BlogRespectModel.deleteMany({ postId });
}
