import {
  LegalPolicyRevisionModel,
  DataDeletionRequestModel,
} from "./models/legal.models.js";
import { AchievementProgressModel } from "../../../models/AchievementProgress.js";
import { AchievementUnlockModel } from "../../../models/AchievementUnlock.js";
import { BlogBookmarkModel } from "../../../models/BlogBookmark.js";
import { BlogCategoryFollowModel } from "../../../models/BlogCategoryFollow.js";
import { BlogCommentModel } from "../../../models/BlogComment.js";
import { BlogPostModel } from "../../../models/BlogPost.js";
import { BlogRepostModel } from "../../../models/BlogRepost.js";
import { BlogRespectModel } from "../../../models/BlogRespect.js";
import { BookmarkGroupModel } from "../../../models/BookmarkGroup.js";
import { DevicePushTokenModel } from "../../../models/DevicePushToken.js";
import { FollowModel } from "../../../models/Follow.js";
import { NotificationModel } from "../../../models/Notification.js";
import { SessionModel } from "../../../models/Session.js";
import { UserModel } from "../../../models/User.js";
import { UserNotificationPreferencesModel } from "../../../models/UserNotificationPreferences.js";
import { UserStatsModel } from "../../../models/UserStats.js";
import { verifyRevisionHash } from "./legalContentHash.js";
import { legalJobQueue, type LegalJobMessage } from "./legalJobQueue.js";
import { env } from "../../../config/env.js";
import { getLegalDbNow } from "./legalDbTime.js";
function logJob(msg: LegalJobMessage): void {
  console.log("[legal:job]", msg.type, msg);
}
async function processPublishPurge(
  msg: Extract<
    LegalJobMessage,
    {
      type: "LEGAL_POLICY_PUBLISHED";
    }
  >,
): Promise<void> {
  logJob(msg);
}
async function processReconsentFanout(
  msg: Extract<
    LegalJobMessage,
    {
      type: "LEGAL_RECONSENT_FANOUT";
    }
  >,
): Promise<void> {
  logJob(msg);
}
const DEFAULT_DELETION_STEPS = [
  "revoke_sessions",
  "remove_activity_data",
  "anonymize_authored_content",
  "anonymize_profile",
  "finalize",
];
type DeletionStep = {
  step: string;
  status: "pending" | "done" | "failed";
  at?: Date;
};
type CountByPost = {
  _id: import("mongoose").Types.ObjectId;
  count: number;
};
function isPastGracePeriod(
  doc: { slaDeadline?: Date | null },
  now: Date,
): boolean {
  return !doc.slaDeadline || doc.slaDeadline <= now;
}
async function decrementPostCounters(
  rows: CountByPost[],
  field: "respectCount" | "repostCount" | "bookmarkCount" | "commentCount",
): Promise<void> {
  await Promise.all(
    rows.map((row) =>
      BlogPostModel.updateOne(
        { _id: row._id },
        { $inc: { [field]: -row.count } },
      ),
    ),
  );
}
async function removeFollowEdges(userId: import("mongoose").Types.ObjectId) {
  const [outgoing, incoming] = await Promise.all([
    FollowModel.find({ follower: userId }).select("following").lean(),
    FollowModel.find({ following: userId }).select("follower").lean(),
  ]);
  await Promise.all([
    ...outgoing.map((row) =>
      UserModel.updateOne(
        { _id: row.following },
        { $inc: { followersCount: -1 } },
      ),
    ),
    ...incoming.map((row) =>
      UserModel.updateOne(
        { _id: row.follower },
        { $inc: { followingCount: -1 } },
      ),
    ),
    FollowModel.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
  ]);
}
async function removeEngagementData(
  userId: import("mongoose").Types.ObjectId,
): Promise<void> {
  const [respects, reposts, bookmarks, comments] = await Promise.all([
    BlogRespectModel.aggregate<CountByPost>([
      { $match: { userId } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]),
    BlogRepostModel.aggregate<CountByPost>([
      { $match: { userId } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]),
    BlogBookmarkModel.aggregate<CountByPost>([
      { $match: { userId } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]),
    BlogCommentModel.aggregate<CountByPost>([
      { $match: { userId } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]),
  ]);
  await Promise.all([
    decrementPostCounters(respects, "respectCount"),
    decrementPostCounters(reposts, "repostCount"),
    decrementPostCounters(bookmarks, "bookmarkCount"),
    decrementPostCounters(comments, "commentCount"),
    BlogCommentModel.updateMany(
      { likedBy: userId },
      { $pull: { likedBy: userId } },
    ),
  ]);
  await Promise.all([
    BlogRespectModel.deleteMany({ userId }),
    BlogRepostModel.deleteMany({ userId }),
    BlogBookmarkModel.deleteMany({ userId }),
    BlogCommentModel.deleteMany({ userId }),
    BookmarkGroupModel.deleteMany({ userId }),
    BlogCategoryFollowModel.deleteMany({ userId }),
    NotificationModel.deleteMany({ userId }),
    UserNotificationPreferencesModel.deleteOne({ userId }),
    DevicePushTokenModel.deleteMany({ userId }),
    AchievementProgressModel.deleteMany({ userId }),
    AchievementUnlockModel.deleteMany({ userId }),
    UserStatsModel.deleteOne({ userId }),
    removeFollowEdges(userId),
  ]);
}
async function anonymizeAuthoredContent(
  userId: import("mongoose").Types.ObjectId,
  now: Date,
): Promise<void> {
  const posts = await BlogPostModel.find({ authorId: userId, deletedAt: null })
    .select("_id")
    .lean();
  await Promise.all(
    posts.map((post) =>
      BlogPostModel.updateOne(
        { _id: post._id },
        {
          $set: {
            title: "[deleted]",
            slug: `deleted-${post._id.toString()}`,
            summary: "",
            content: "",
            status: "suspended",
            deletedAt: now,
            deletedById: userId,
            lastEditedAt: now,
            lastEditedById: userId,
            respectCount: 0,
            repostCount: 0,
            bookmarkCount: 0,
            commentCount: 0,
          },
          $unset: {
            thumbnailUrl: 1,
          },
        },
      ),
    ),
  );
}
async function anonymizeUserProfile(
  userId: import("mongoose").Types.ObjectId,
  now: Date,
): Promise<void> {
  const suffix = userId.toString();
  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        fullName: "Deleted User",
        username: `deleted_user_${suffix.slice(-12)}`,
        email: `deleted+${suffix}@syntax-stories.invalid`,
        isActive: false,
        emailVerified: false,
        isGoogleAccount: false,
        isGitAccount: false,
        isFacebookAccount: false,
        isXAccount: false,
        isAppleAccount: false,
        isDiscordAccount: false,
        isTwitchAccount: false,
        twoFactorEnabled: false,
        passkeys: [],
        passkeyStepUpEnabled: false,
        followersCount: 0,
        followingCount: 0,
        profileVersion: 0,
        profileUpdatedAt: now,
        stackAndTools: [],
        certifications: [],
        projects: [],
        openSourceContributions: [],
        mySetup: [],
        deletedAt: now,
        deletedById: userId,
        blogRespectReceivedCount: 0,
        readStreakLongest: 0,
      },
      $unset: {
        profileImg: 1,
        profileImgAlt: 1,
        coverBanner: 1,
        coverBannerAlt: 1,
        gender: 1,
        job: 1,
        profileLocation: 1,
        bio: 1,
        portfolioUrl: 1,
        linkedin: 1,
        instagram: 1,
        github: 1,
        youtube: 1,
        googleId: 1,
        gitId: 1,
        facebookId: 1,
        appleId: 1,
        xId: 1,
        discordId: 1,
        twitchId: 1,
        googleToken: 1,
        githubToken: 1,
        facebookToken: 1,
        xToken: 1,
        appleToken: 1,
        discordToken: 1,
        twitchToken: 1,
        twoFactorSecret: 1,
        referralCode: 1,
        referredByUserId: 1,
        referredAt: 1,
        referralSource: 1,
        referralCapturedAt: 1,
        staffPasswordHash: 1,
      },
    },
  );
}
async function executeDeletionStep(
  step: string,
  userId: import("mongoose").Types.ObjectId,
  now: Date,
): Promise<void> {
  switch (step) {
    case "revoke_sessions":
      await SessionModel.updateMany(
        { userId, revoked: false },
        { $set: { revoked: true, revokedReason: "data_deletion" } },
      );
      return;
    case "remove_activity_data":
      await removeEngagementData(userId);
      return;
    case "anonymize_authored_content":
      await anonymizeAuthoredContent(userId, now);
      return;
    case "anonymize_profile":
      await anonymizeUserProfile(userId, now);
      return;
    case "finalize":
      return;
    default:
      throw new Error(`Unknown data deletion step: ${step}`);
  }
}
async function processDeletionPipeline(
  msg: Extract<
    LegalJobMessage,
    {
      type: "DATA_DELETION_PROCESS";
    }
  >,
): Promise<void> {
  const maxSteps = 20;
  for (let i = 0; i < maxSteps; i++) {
    const doc = await DataDeletionRequestModel.findById(msg.requestId).exec();
    if (!doc) return;
    const now = await getLegalDbNow();
    if (!isPastGracePeriod(doc, now)) {
      if (!doc.executionSteps) {
        doc.executionSteps = [
          {
            step: "wait_30_day_grace_period",
            status: "pending",
          },
        ];
        await doc.save();
      }
      return;
    }
    if (doc.status === "requested") {
      const steps = DEFAULT_DELETION_STEPS.map((step) => ({
        step,
        status: "pending" as const,
      }));
      doc.status = "processing";
      doc.executionSteps = steps;
      await doc.save();
      continue;
    }
    if (doc.status !== "processing" || doc.legalHold) return;
    const steps =
      (doc.executionSteps as
        | DeletionStep[]
        | undefined) ?? [];
    const next = steps.find(
      (s: { status: string }) =>
        s.status === "pending" || s.status === "failed",
    );
    if (!next) {
      if (
        steps.length &&
        steps.every((s: { status: string }) => s.status === "done")
      ) {
        const now = await getLegalDbNow();
        doc.status = "completed";
        doc.completedAt = now;
        await doc.save();
      }
      return;
    }
    try {
      await executeDeletionStep(next.step, doc.userId, now);
      next.status = "done";
      next.at = now;
      await doc.save();
    } catch (e) {
      next.status = "failed";
      next.at = now;
      doc.compensationStatus = "manual_recovery_required";
      doc.notes = `${doc.notes ? `${doc.notes}\n` : ""}${next.step}: ${
        (e as Error).message
      }`;
      await doc.save();
      throw e;
    }
  }
}
async function enqueueDueDeletionRequests(): Promise<void> {
  const now = await getLegalDbNow();
  const due = await DataDeletionRequestModel.find({
    status: { $in: ["requested", "processing"] },
    legalHold: { $ne: true },
    slaDeadline: { $lte: now },
  })
    .select("_id")
    .limit(50)
    .lean();
  for (const doc of due) {
    const requestId = doc._id.toString();
    if (
      !legalJobQueue.some(
        (msg) => msg.type === "DATA_DELETION_PROCESS" && msg.requestId === requestId,
      )
    ) {
      legalJobQueue.push({ type: "DATA_DELETION_PROCESS", requestId });
    }
  }
}
async function runIntegrityAudit(): Promise<void> {
  try {
    const sample = await LegalPolicyRevisionModel.find({ status: "published" })
      .limit(50)
      .exec();
    for (const rev of sample) {
      const ok = verifyRevisionHash({
        title: rev.title,
        summary: rev.summary,
        body: rev.body,
        contentHash: rev.contentHash,
      });
      if (!ok) {
        console.error("[legal:integrity] drift", {
          revisionId: rev.revisionId,
          kind: rev.kind,
        });
      }
    }
  } catch (e) {
    console.warn("[legal:integrity] skipped:", (e as Error).message);
  }
}
export function startLegalBackgroundJobs(): void {
  const intervalMs = env.LEGAL_JOB_POLL_MS;
  setInterval(() => {
    void enqueueDueDeletionRequests();
    while (legalJobQueue.length) {
      const msg = legalJobQueue.shift();
      if (!msg) break;
      void (async () => {
        try {
          if (msg.type === "LEGAL_POLICY_PUBLISHED")
            await processPublishPurge(msg);
          else if (msg.type === "LEGAL_RECONSENT_FANOUT")
            await processReconsentFanout(msg);
          else if (msg.type === "DATA_DELETION_PROCESS")
            await processDeletionPipeline(msg);
        } catch (e) {
          console.error("[legal:job] failed", msg, e);
        }
      })();
    }
  }, intervalMs);
  setInterval(() => {
    void runIntegrityAudit();
  }, env.LEGAL_INTEGRITY_INTERVAL_MS);
}
