import mongoose from "mongoose";
import { getRedis } from "../../config/redis.js";
import { redisKeys } from "../../shared/redis/keys.js";
import { BlogPostModel } from "../../models/BlogPost.js";
import {
  REPOST_MILESTONES,
  RESPECT_MILESTONES,
  VIEW_MILESTONES,
} from "./notification.types.js";
import { createNotification } from "./notification.service.js";
function postHref(username: string, slug: string): string {
  return `/blogs/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
}
async function milestoneAlreadySent(
  postId: string,
  metric: string,
  threshold: number,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const key = redisKeys.notifications.milestoneSent(postId, metric, threshold);
  const existing = await redis.get(key);
  return existing === "1";
}
async function markMilestoneSent(
  postId: string,
  metric: string,
  threshold: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const key = redisKeys.notifications.milestoneSent(postId, metric, threshold);
  await redis.set(key, "1", { EX: 60 * 60 * 24 * 365 });
}
export async function evaluatePostEngagementMilestones(
  postId: mongoose.Types.ObjectId,
): Promise<void> {
  const post = await BlogPostModel.findById(postId)
    .select("title slug authorId respectCount repostCount viewCount squadId")
    .populate({ path: "authorId", select: "username", model: "users" })
    .lean();
  if (!post) return;
  const authorRaw = post.authorId as unknown;
  const authorId =
    authorRaw && typeof authorRaw === "object" && "_id" in (authorRaw as object)
      ? String(
          (
            authorRaw as {
              _id: mongoose.Types.ObjectId;
            }
          )._id,
        )
      : String(authorRaw);
  const username =
    authorRaw &&
    typeof authorRaw === "object" &&
    "username" in (authorRaw as object)
      ? String(
          (
            authorRaw as {
              username?: string;
            }
          ).username ?? "",
        )
      : "";
  const slug = typeof post.slug === "string" ? post.slug : "";
  const title = typeof post.title === "string" ? post.title : "Your post";
  const href = username && slug ? postHref(username, slug) : "/blogs";
  const repostCount = Math.max(
    0,
    (
      post as {
        repostCount?: number;
      }
    ).repostCount ?? 0,
  );
  const viewCount = Math.max(
    0,
    (
      post as {
        viewCount?: number;
      }
    ).viewCount ?? 0,
  );
  const respectCount = Math.max(
    0,
    (
      post as {
        respectCount?: number;
      }
    ).respectCount ?? 0,
  );
  const checks: Array<{
    metric: string;
    count: number;
    thresholds: readonly number[];
    type: "repost_milestone" | "view_milestone" | "respect_milestone";
    icon: "repeat" | "eye" | "heart";
    label: string;
  }> = [
    {
      metric: "repost",
      count: repostCount,
      thresholds: REPOST_MILESTONES,
      type: "repost_milestone",
      icon: "repeat",
      label: "reposts",
    },
    {
      metric: "view",
      count: viewCount,
      thresholds: VIEW_MILESTONES,
      type: "view_milestone",
      icon: "eye",
      label: "views",
    },
    {
      metric: "respect",
      count: respectCount,
      thresholds: RESPECT_MILESTONES,
      type: "respect_milestone",
      icon: "heart",
      label: "respects",
    },
  ];
  for (const c of checks) {
    for (const threshold of c.thresholds) {
      if (c.count < threshold) continue;
      const sent = await milestoneAlreadySent(
        String(postId),
        c.metric,
        threshold,
      );
      if (sent) continue;
      await markMilestoneSent(String(postId), c.metric, threshold);
      const countLabel =
        threshold >= 1000 ? `${threshold / 1000}K` : String(threshold);
      void createNotification({
        userId: authorId,
        type: c.type,
        title: `${countLabel} ${c.label}!`,
        message: `"${title.slice(0, 80)}" reached ${threshold.toLocaleString()} ${c.label}.`,
        href,
        icon: c.icon,
        metadata: { postId: String(postId), metric: c.metric, threshold },
      });
    }
  }
  const squadId = (
    post as {
      squadId?: mongoose.Types.ObjectId;
    }
  ).squadId;
  if (squadId) {
    await notifySquadRespectMilestones({
      squadId,
      postId,
      title,
      href,
      respectCount,
    });
  }
  await evaluateTrendingNotification({
    postId,
    authorId,
    title,
    href,
    viewCount,
    repostCount,
    respectCount,
  });
}
async function notifySquadRespectMilestones(params: {
  squadId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  title: string;
  href: string;
  respectCount: number;
}): Promise<void> {
  const { SquadMemberModel } = await import("../../models/SquadMember.js");
  const { SquadModel } = await import("../../models/Squad.js");
  for (const threshold of RESPECT_MILESTONES) {
    if (params.respectCount < threshold) continue;
    const sent = await milestoneAlreadySent(
      String(params.postId),
      `squad_respect`,
      threshold,
    );
    if (sent) continue;
    await markMilestoneSent(String(params.postId), `squad_respect`, threshold);
    const squad = await SquadModel.findById(params.squadId)
      .select("slug name")
      .lean();
    if (!squad) continue;
    const admins = await SquadMemberModel.find({
      squadId: params.squadId,
      role: { $in: ["admin", "moderator"] },
    })
      .select("userId")
      .lean();
    for (const m of admins) {
      void createNotification({
        userId: String(m.userId),
        type: "respect_milestone",
        title: `Squad post: ${threshold} respects`,
        message: `"${params.title.slice(0, 60)}" in ${squad.name} reached ${threshold} respects.`,
        href: `/squads/${encodeURIComponent(squad.slug)}`,
        icon: "heart",
        metadata: {
          postId: String(params.postId),
          squadId: String(params.squadId),
          threshold,
        },
        skipWebhook: true,
      });
    }
  }
}
const TRENDING_VIEW_MIN = 100;
const TRENDING_ENGAGEMENT_MIN = 15;
async function evaluateTrendingNotification(params: {
  postId: mongoose.Types.ObjectId;
  authorId: string;
  title: string;
  href: string;
  viewCount: number;
  repostCount: number;
  respectCount: number;
}): Promise<void> {
  const engagement = params.repostCount + params.respectCount;
  if (
    params.viewCount < TRENDING_VIEW_MIN ||
    engagement < TRENDING_ENGAGEMENT_MIN
  )
    return;
  const redis = getRedis();
  const flagKey = redisKeys.notifications.trendingSent(String(params.postId));
  if (redis) {
    const existing = await redis.get(flagKey);
    if (existing === "1") return;
  }
  const recentCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const topPosts = await BlogPostModel.find({
    status: "published",
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    publishedAt: { $gte: recentCutoff },
  })
    .select("_id viewCount respectCount repostCount")
    .sort({ viewCount: -1, respectCount: -1, repostCount: -1 })
    .limit(30)
    .lean();
  const isInTop = topPosts.some((p) => String(p._id) === String(params.postId));
  if (!isInTop) return;
  if (redis) {
    await redis.set(flagKey, "1", { EX: 60 * 60 * 24 * 30 });
  }
  void createNotification({
    userId: params.authorId,
    type: "post_trending",
    title: "Your post is trending",
    message: `"${params.title.slice(0, 80)}" is gaining traction on Trending.`,
    href: params.href,
    icon: "trending",
    metadata: { postId: String(params.postId) },
  });
  void createNotification({
    userId: params.authorId,
    type: "blog_trending",
    title: "Featured on Trending",
    message: `"${params.title.slice(0, 80)}" appears in the trending section.`,
    href: "/trending",
    icon: "trending",
    metadata: { postId: String(params.postId) },
  });
}
