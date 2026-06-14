import mongoose from "mongoose";
import { BlogCategoryFollowModel } from "../../models/BlogCategoryFollow.js";
import { BlogPostModel } from "../../models/BlogPost.js";
import { BlogRespectModel } from "../../models/BlogRespect.js";
import { FeedbackSubmissionModel } from "../../models/FeedbackSubmission.js";
import { FollowModel } from "../../models/Follow.js";
import { SquadMemberModel } from "../../models/SquadMember.js";
import {
  DEFAULT_AVATAR_URL,
  normalizeProfileImg,
  UserModel,
} from "../../models/User.js";
import { UserStatsModel, type IUserStats } from "../../models/UserStats.js";
import type {
  AchievementEvent,
  MetricSnapshot,
} from "../../achievements/achievement.types.js";
import { isPlaceholderProfileBio } from "../../utils/profileBio.js";
export async function getOrCreateUserStats(
  userId: string,
): Promise<IUserStats> {
  const oid = new mongoose.Types.ObjectId(userId);
  let doc = await UserStatsModel.findOne({ userId: oid });
  if (doc) return doc;
  try {
    doc = await UserStatsModel.create({ userId: oid });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("E11000") || msg.includes("duplicate key")) {
      doc = await UserStatsModel.findOne({ userId: oid });
      if (doc) return doc;
    }
    throw e;
  }
  try {
    await syncUserStatsFromSources(userId, doc);
  } catch (e) {
    console.warn("[UserStats] initial sync failed for", userId, String(e));
  }
  return doc;
}
export async function syncUserStatsFromSources(
  userId: string,
  existing?: IUserStats,
): Promise<IUserStats> {
  const oid = new mongoose.Types.ObjectId(userId);
  const user = await UserModel.findById(oid)
    .select(
      "profileImg bio coverBanner profileLocation stackAndTools mySetup github followersCount blogRespectReceivedCount readStreakLongest",
    )
    .lean();
  const [
    respectGivenCount,
    postsAuthoredCount,
    followingCount,
    categoriesFollowedCount,
    squadsJoinedCount,
    feedbackSubmittedCount,
  ] = await Promise.all([
    BlogRespectModel.countDocuments({ userId: oid }),
    BlogPostModel.countDocuments({
      authorId: oid,
      status: "published",
      deletedAt: null,
    }),
    FollowModel.countDocuments({ follower: oid }),
    BlogCategoryFollowModel.countDocuments({ userId: oid }),
    SquadMemberModel.countDocuments({ userId: oid }),
    FeedbackSubmissionModel.countDocuments({ userId: oid }),
  ]);
  const profileImg = user
    ? normalizeProfileImg(user.profileImg)
    : DEFAULT_AVATAR_URL;
  const hasCustomAvatar =
    profileImg !== DEFAULT_AVATAR_URL && !profileImg.includes("dicebear");
  const bio = (user?.bio ?? "").trim();
  const hasBio = bio.length >= 20 && !isPlaceholderProfileBio(bio);
  const patch = {
    postsCount: postsAuthoredCount,
    followingCount,
    followersCount: Math.max(0, user?.followersCount ?? 0),
    respectGiven: respectGivenCount,
    respectReceived: Math.max(0, user?.blogRespectReceivedCount ?? 0),
    categoriesFollowedCount,
    squadsJoinedCount,
    feedbackSubmittedCount,
    stackToolsCount: user?.stackAndTools?.filter((s) => s?.trim()).length ?? 0,
    setupCount:
      user?.mySetup?.filter(
        (item) => item?.label?.trim() || item?.imageUrl?.trim(),
      ).length ?? 0,
    hasAvatar: hasCustomAvatar ? 1 : 0,
    hasBio: hasBio ? 1 : 0,
    hasCover: user?.coverBanner?.trim() ? 1 : 0,
    hasGithub: (
      user as {
        github?: string;
      } | null
    )?.github?.trim()
      ? 1
      : 0,
    hasLocation: (
      user as {
        profileLocation?: string;
      } | null
    )?.profileLocation?.trim()
      ? 1
      : 0,
    readStreakLongest: Math.max(0, user?.readStreakLongest ?? 0),
  };
  if (existing) {
    Object.assign(existing, patch);
    await existing.save();
    return existing;
  }
  const doc = await UserStatsModel.findOneAndUpdate(
    { userId: oid },
    { $set: patch, $setOnInsert: { userId: oid } },
    { upsert: true, new: true },
  );
  return doc!;
}
export async function applyAchievementEventsToUserStats(
  userId: string,
  events: AchievementEvent[],
): Promise<IUserStats> {
  const stats = await getOrCreateUserStats(userId);
  let dirty = false;
  for (const event of events) {
    if (event.type === "respect_given") {
      stats.respectGiven = (stats.respectGiven ?? 0) + 1;
      dirty = true;
    } else if (event.type === "brief_read") {
      stats.briefsRead = (stats.briefsRead ?? 0) + 1;
      dirty = true;
    } else if (event.type === "cv_parsed") {
      stats.hasCv = 1;
      dirty = true;
    }
  }
  const needsSync = events.some((e) => e.type === "profile_sync");
  if (needsSync) {
    await syncUserStatsFromSources(userId, stats);
    return stats;
  }
  if (dirty) {
    await stats.save();
  }
  return stats;
}
export function userStatsToMetricSnapshot(stats: IUserStats): MetricSnapshot {
  return {
    "respect.given.total": stats.respectGiven ?? 0,
    "respect.received.total": stats.respectReceived ?? 0,
    "read.brief.total": stats.briefsRead ?? 0,
    "stack.tools.count": stats.stackToolsCount ?? 0,
    "followers.count": stats.followersCount ?? 0,
    "read.streak.longest": stats.readStreakLongest ?? 0,
    "profile.has_avatar": stats.hasAvatar ?? 0,
    "profile.has_location": stats.hasLocation ?? 0,
    "profile.has_cv": stats.hasCv ?? 0,
    "profile.has_bio": stats.hasBio ?? 0,
    "profile.has_cover": stats.hasCover ?? 0,
    "profile.has_github": stats.hasGithub ?? 0,
    "profile.setup.count": stats.setupCount ?? 0,
    "social.following.count": stats.followingCount ?? 0,
    "blog.categories.followed.count": stats.categoriesFollowedCount ?? 0,
    "squads.joined.count": stats.squadsJoinedCount ?? 0,
    "feedback.submitted.count": stats.feedbackSubmittedCount ?? 0,
    "posts.authored.count": stats.postsCount ?? 0,
    "referral.converted.total": stats.referralsConverted ?? 0,
  };
}
export async function addXpAndPoints(
  userId: string,
  points: number,
  xp: number,
): Promise<{
  level: number;
  leveledUp: boolean;
  previousLevel: number;
}> {
  const stats = await getOrCreateUserStats(userId);
  const previousLevel = stats.level ?? 1;
  stats.totalAchievementPoints = (stats.totalAchievementPoints ?? 0) + points;
  stats.xp = (stats.xp ?? 0) + xp;
  stats.level = levelFromXp(stats.xp);
  await stats.save();
  return {
    level: stats.level,
    leveledUp: stats.level > previousLevel,
    previousLevel,
  };
}
export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  return Math.max(1, Math.floor(Math.sqrt(xp / 25)) + 1);
}
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) ** 2 * 25;
}
