import { BlogPostModel } from '../../models/BlogPost.js';
import { UserModel } from '../../models/User.js';
import { measureBlogContent } from '../../modules/blog/contentMetrics.js';
import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';
import { getUptimePercent } from './platformUptime.service.js';

export type PublicPlatformStats = {
  linesWritten: number;
  activeUsers: number;
  components: number;
  uptimePercent: number;
  collectedAt: string;
};

const CACHE_TTL_SEC = 600;

async function readCachedStats(): Promise<PublicPlatformStats | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(redisKeys.platform.publicStats);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicPlatformStats;
  } catch {
    return null;
  }
}

async function writeCachedStats(stats: PublicPlatformStats): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.setEx(redisKeys.platform.publicStats, CACHE_TTL_SEC, JSON.stringify(stats));
}

async function collectStats(): Promise<PublicPlatformStats> {
  const [activeUsers, posts] = await Promise.all([
    UserModel.countDocuments({ isActive: true, deletedAt: null }),
    BlogPostModel.find({
      status: 'published',
      deletedAt: null,
    })
      .select('content title')
      .lean(),
  ]);

  let linesWritten = 0;
  let components = 0;

  for (const post of posts) {
    if (typeof post.title === 'string' && post.title.trim()) {
      linesWritten += 1;
    }
    const metrics = measureBlogContent(post.content);
    linesWritten += metrics.lines;
    components += metrics.blocks;
  }

  const uptimePercent = await getUptimePercent();

  return {
    linesWritten,
    activeUsers,
    components,
    uptimePercent,
    collectedAt: new Date().toISOString(),
  };
}

export async function getPublicPlatformStats(): Promise<PublicPlatformStats> {
  const cached = await readCachedStats();
  if (cached) return cached;

  const stats = await collectStats();
  await writeCachedStats(stats);
  return stats;
}
