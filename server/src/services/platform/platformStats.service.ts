import { BlogPostModel } from "../../models/BlogPost.js";
import {
  PlatformStatsSnapshotModel,
  type IPlatformStatsSnapshot,
} from "../../models/PlatformStatsSnapshot.js";
import { UserModel } from "../../models/User.js";
import { measureBlogContent } from "../../modules/blog/contentMetrics.js";
import { getRedis } from "../../config/redis.js";
import { redisKeys } from "../../shared/redis/keys.js";
import { getUptimePercent } from "./platformUptime.service.js";
export type PublicPlatformStats = {
  linesWritten: number;
  activeUsers: number;
  components: number;
  uptimePercent: number;
  collectedAt: string;
};
const CACHE_TTL_SEC = 600;
const PLATFORM_STATS_TIMEZONE = "Asia/Kolkata";

function indiaDayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PLATFORM_STATS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function mapSnapshot(doc: IPlatformStatsSnapshot): PublicPlatformStats {
  return {
    linesWritten: doc.linesWritten,
    activeUsers: doc.activeUsers,
    components: doc.components,
    uptimePercent: doc.uptimePercent,
    collectedAt: doc.collectedAt.toISOString(),
  };
}
async function readCachedStats(
  dayKey: string,
): Promise<PublicPlatformStats | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(redisKeys.platform.publicStats(dayKey));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicPlatformStats;
  } catch {
    return null;
  }
}
async function writeCachedStats(
  dayKey: string,
  stats: PublicPlatformStats,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.setEx(
    redisKeys.platform.publicStats(dayKey),
    CACHE_TTL_SEC,
    JSON.stringify(stats),
  );
}
async function collectStats(): Promise<PublicPlatformStats> {
  const [activeUsers, posts] = await Promise.all([
    UserModel.countDocuments({ isActive: true, deletedAt: null }),
    BlogPostModel.find({
      status: "published",
      deletedAt: null,
    })
      .select("content title")
      .lean(),
  ]);
  let linesWritten = 0;
  let components = 0;
  for (const post of posts) {
    if (typeof post.title === "string" && post.title.trim()) {
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
  const dayKey = indiaDayKey();
  const cached = await readCachedStats(dayKey);
  if (cached) return cached;
  const snapshot = await PlatformStatsSnapshotModel.findOne({ dayKey });
  if (snapshot) {
    const stats = mapSnapshot(snapshot);
    await writeCachedStats(dayKey, stats);
    return stats;
  }
  const stats = await collectStats();
  const collectedAt = new Date(stats.collectedAt);
  const doc = await PlatformStatsSnapshotModel.findOneAndUpdate(
    { dayKey },
    {
      $setOnInsert: {
        dayKey,
        timezone: PLATFORM_STATS_TIMEZONE,
        linesWritten: stats.linesWritten,
        activeUsers: stats.activeUsers,
        components: stats.components,
        uptimePercent: stats.uptimePercent,
        collectedAt,
      },
    },
    { new: true, upsert: true },
  );
  const storedStats = doc ? mapSnapshot(doc) : stats;
  await writeCachedStats(dayKey, storedStats);
  return storedStats;
}

export const platformStatsInternals = {
  indiaDayKey,
  timezone: PLATFORM_STATS_TIMEZONE,
};
