import type { Request } from 'express';
import mongoose from 'mongoose';
import { BlogPostModel } from '../models/BlogPost.js';
import { BlogRepostModel } from '../models/BlogRepost.js';
import { BlogCommentModel } from '../models/BlogComment.js';
import { buildFeedListItemsForPosts } from '../controllers/blog.controller.js';
import { NOT_DELETED_FILTER } from '../shared/db/notDeleted.js';
import { BLOG_POST_FEED_POPULATE } from '../shared/db/blogPostPopulate.js';

async function loadOrderedPublishedPostDocs(postIds: mongoose.Types.ObjectId[]) {
  if (!postIds.length) return [];

  const postsRaw = await BlogPostModel.find({
    _id: { $in: postIds },
    status: 'published',
    ...NOT_DELETED_FILTER,
  })
    .populate([...BLOG_POST_FEED_POPULATE])
    .lean();

  const postById = new Map<string, (typeof postsRaw)[number]>();
  for (const p of postsRaw) postById.set(String(p._id), p);

  const orderedDocs: unknown[] = [];
  for (const id of postIds) {
    const doc = postById.get(String(id));
    if (doc) orderedDocs.push(doc);
  }
  return orderedDocs;
}

function uniquePostIdsInOrder(
  rows: readonly { postId: mongoose.Types.ObjectId }[],
  limit: number
): mongoose.Types.ObjectId[] {
  const seen = new Set<string>();
  const postIds: mongoose.Types.ObjectId[] = [];
  for (const row of rows) {
    const key = String(row.postId);
    if (seen.has(key)) continue;
    seen.add(key);
    postIds.push(row.postId);
    if (postIds.length >= limit) break;
  }
  return postIds;
}

/** Published posts this user reposted, most recent repost first. */
export async function listProfileRepostedFeedItems(
  req: Request,
  userId: mongoose.Types.ObjectId,
  limit: number
) {
  const scan = Math.min(200, Math.max(limit * 3, 48));
  const reposts = await BlogRepostModel.find({ userId })
    .sort({ createdAt: -1 })
    .limit(scan)
    .select('postId')
    .lean();

  const postIds = uniquePostIdsInOrder(reposts, limit);
  const docs = await loadOrderedPublishedPostDocs(postIds);
  return buildFeedListItemsForPosts(req, docs);
}

/** Published posts this user commented on, most recent comment first. */
export async function listProfileRepliedFeedItems(
  req: Request,
  userId: mongoose.Types.ObjectId,
  limit: number
) {
  const scan = Math.min(200, Math.max(limit * 4, 60));
  const comments = await BlogCommentModel.find({ userId })
    .sort({ createdAt: -1 })
    .limit(scan)
    .select('postId')
    .lean();

  const postIds = uniquePostIdsInOrder(comments, limit);
  const docs = await loadOrderedPublishedPostDocs(postIds);
  return buildFeedListItemsForPosts(req, docs);
}
