import { Request, Response } from 'express';
import { getRedis } from '../config/redis.js';
import { BlogPostModel } from '../models/BlogPost.js';
import { UserModel } from '../models/User.js';
import { redisKeys } from '../shared/redis/keys.js';
import { normalizeRespectCount } from '../services/blogRespect.service.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}

function normalizeCounter(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  return 0;
}

/**
 * GET /api/blog/p/:username/:slug/stats/stream — SSE; initial snapshot + Redis Pub/Sub updates.
 * Requires Redis for live fan-out; without Redis, sends snapshot then periodic comments only.
 */
export async function streamBlogPostStats(req: Request, res: Response): Promise<void> {
  const usernameParam = paramString(req.params.username);
  const slug = paramString(req.params.slug);
  if (!usernameParam || !slug) {
    res.status(400).json({ success: false, message: 'Invalid path' });
    return;
  }

  const user = await UserModel.findOne({
    username: new RegExp(`^${escapeRegex(usernameParam)}$`, 'i'),
  })
    .select('_id')
    .lean();
  if (!user) {
    res.status(404).json({ success: false, message: 'Author not found' });
    return;
  }

  const post = await BlogPostModel.findOne({
    authorId: user._id,
    slug,
    status: 'published',
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  })
    .select('_id respectCount repostCount bookmarkCount commentCount viewCount')
    .lean();

  if (!post?._id) {
    res.status(404).json({ success: false, message: 'Post not found' });
    return;
  }

  const postId = String(post._id);

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as Response & { flushHeaders?: () => void }).flushHeaders === 'function') {
    (res as Response & { flushHeaders: () => void }).flushHeaders();
  }

  const send = (obj: unknown) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  const snapshot = {
    type: 'snapshot' as const,
    postId,
    stats: {
      respectCount: normalizeRespectCount((post as { respectCount?: number }).respectCount),
      repostCount: normalizeCounter((post as { repostCount?: number }).repostCount),
      bookmarkCount: normalizeCounter((post as { bookmarkCount?: number }).bookmarkCount),
      commentCount: normalizeCounter((post as { commentCount?: number }).commentCount),
      viewCount: normalizeCounter((post as { viewCount?: number }).viewCount),
    },
  };
  send(snapshot);

  const redis = getRedis();
  if (!redis) {
    const ping = setInterval(() => {
      res.write(': ping\n\n');
    }, 25_000);
    req.on('close', () => clearInterval(ping));
    return;
  }

  let sub: ReturnType<typeof redis.duplicate> | null = null;
  try {
    sub = redis.duplicate();
    await sub.connect();
  } catch (e) {
    console.warn(JSON.stringify({ event: 'blog_stats_sse_sub_connect_failed', err: String(e) }));
    const ping = setInterval(() => {
      res.write(': ping\n\n');
    }, 25_000);
    req.on('close', () => clearInterval(ping));
    return;
  }

  const channel = redisKeys.blog.statsChannel(postId);

  const onMessage = (message: string) => {
    try {
      const parsed = JSON.parse(message) as { stats?: unknown };
      if (parsed && typeof parsed === 'object' && parsed.stats) {
        send({ type: 'update', postId, stats: parsed.stats });
      } else {
        send({ type: 'raw', payload: parsed });
      }
    } catch {
      send({ type: 'raw', payload: message });
    }
  };

  await sub.subscribe(channel, onMessage);

  const ping = setInterval(() => {
    res.write(': ping\n\n');
  }, 25_000);

  req.on('close', () => {
    clearInterval(ping);
    void (async () => {
      try {
        if (sub) {
          await sub.unsubscribe(channel);
          await sub.quit();
        }
      } catch {
        /* ignore */
      }
    })();
  });
}
