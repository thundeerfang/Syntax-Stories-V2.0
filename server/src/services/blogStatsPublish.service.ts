import mongoose from 'mongoose';
import { getRedis } from '../config/redis.js';
import { BlogPostModel } from '../models/BlogPost.js';
import { redisKeys } from '../shared/redis/keys.js';
import { normalizeRespectCount } from './blogRespect.service.js';

function normalizeCounter(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  return 0;
}

export type BlogPostStatsPayload = {
  v: 1;
  type: 'blog_post_stats';
  postId: string;
  username: string;
  slug: string;
  stats: {
    respectCount: number;
    repostCount: number;
    bookmarkCount: number;
    commentCount: number;
    viewCount: number;
  };
  ts: number;
};

/**
 * Loads denormalized counters from Mongo, publishes to Redis Pub/Sub (per-post channel),
 * and LPUSHes a copy to the stats outbox list for webhook workers / sidecars.
 */
export async function publishBlogPostStatsSnapshot(postId: mongoose.Types.ObjectId): Promise<void> {
  const post = await BlogPostModel.findById(postId)
    .select('respectCount repostCount bookmarkCount commentCount viewCount slug authorId')
    .populate({ path: 'authorId', select: 'username', model: 'users' })
    .lean();
  if (!post) return;

  const aRaw = post.authorId as unknown;
  const username =
    aRaw && typeof aRaw === 'object' && !Array.isArray(aRaw) && 'username' in aRaw
      ? String((aRaw as { username?: string }).username ?? '')
      : '';

  const payload: BlogPostStatsPayload = {
    v: 1,
    type: 'blog_post_stats',
    postId: String(postId),
    username,
    slug: typeof post.slug === 'string' ? post.slug : '',
    stats: {
      respectCount: normalizeRespectCount((post as { respectCount?: number }).respectCount),
      repostCount: normalizeCounter((post as { repostCount?: number }).repostCount),
      bookmarkCount: normalizeCounter((post as { bookmarkCount?: number }).bookmarkCount),
      commentCount: normalizeCounter((post as { commentCount?: number }).commentCount),
      viewCount: normalizeCounter((post as { viewCount?: number }).viewCount),
    },
    ts: Date.now(),
  };

  const redis = getRedis();
  const msg = JSON.stringify(payload);
  if (!redis) return;

  try {
    await redis.publish(redisKeys.blog.statsChannel(String(postId)), msg);
    await redis.lPush(redisKeys.blog.statsOutbox, msg);
  } catch (e) {
    console.warn(JSON.stringify({ event: 'blog_stats_publish_failed', err: String(e) }));
  }

  void import('./notifications/notificationMilestones.service.js').then(({ evaluatePostEngagementMilestones }) =>
    evaluatePostEngagementMilestones(postId).catch((err) =>
      console.warn('[notificationMilestones]', String(err))
    )
  );
}
