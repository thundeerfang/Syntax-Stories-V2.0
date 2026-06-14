import mongoose from "mongoose";
import { BlogPostModel } from "../../models/BlogPost.js";
import { BlogCommentModel } from "../../models/BlogComment.js";
import { BlogRepostModel } from "../../models/BlogRepost.js";
import { BlogRespectModel } from "../../models/BlogRespect.js";
import { BlogBookmarkModel } from "../../models/BlogBookmark.js";
import { AnalyticsEventModel } from "../../models/AnalyticsEvent.js";
import { adminUserRefFromObjectId } from "../iam/adminUserRef.js";
import { PAGINATION } from "../../shared/http/pagination.js";
export type BlogEngagementMetric =
  | "views"
  | "respects"
  | "comments"
  | "reposts"
  | "bookmarks";
export type AdminBlogEngagementRow = {
  id: string;
  kind: "user" | "anonymous";
  username: string | null;
  fullName: string | null;
  userRef: string | null;
  profileImg: string | null;
  createdAt: string | null;
  textPreview?: string;
};
function iso(d: Date | undefined | null): string | null {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}
function mapUser(
  u: {
    _id?: mongoose.Types.ObjectId;
    username?: string;
    fullName?: string;
    profileImg?: string;
  } | null,
): Pick<
  AdminBlogEngagementRow,
  "username" | "fullName" | "userRef" | "profileImg"
> {
  if (!u || !u._id) {
    return { username: null, fullName: null, userRef: null, profileImg: null };
  }
  const id = String(u._id);
  return {
    username: u.username ?? null,
    fullName: u.fullName ?? null,
    userRef: adminUserRefFromObjectId(id),
    profileImg: u.profileImg ?? null,
  };
}
async function ensurePost(postId: mongoose.Types.ObjectId) {
  return BlogPostModel.findOne({
    _id: postId,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  })
    .select(
      "title viewCount respectCount commentCount repostCount bookmarkCount",
    )
    .lean();
}
export async function loadBlogEngagement(
  postId: mongoose.Types.ObjectId,
  metric: BlogEngagementMetric,
  limit: number,
) {
  const post = await ensurePost(postId);
  if (!post) return null;
  const cap = Math.min(Math.max(limit, 1), PAGINATION.adminList.max);
  if (metric === "views") {
    const events = await AnalyticsEventModel.find({
      type: "post_view",
      targetType: "post",
      targetId: postId,
    })
      .sort({ timestamp: -1 })
      .limit(cap)
      .populate({ path: "actorId", select: "username fullName profileImg" })
      .lean();
    const loggedIn: AdminBlogEngagementRow[] = events.map((e) => {
      const u = mapUser(
        e.actorId as {
          _id?: mongoose.Types.ObjectId;
          username?: string;
          fullName?: string;
          profileImg?: string;
        } | null,
      );
      return {
        id: String(e._id),
        kind: "user" as const,
        ...u,
        createdAt: iso(e.timestamp),
      };
    });
    const total = post.viewCount ?? 0;
    const anonymousEstimate = Math.max(0, total - loggedIn.length);
    const anonymous: AdminBlogEngagementRow[] = [];
    const showAnonymous = Math.min(anonymousEstimate, cap);
    for (let i = 0; i < showAnonymous; i++) {
      anonymous.push({
        id: `anonymous-${i}`,
        kind: "anonymous",
        username: null,
        fullName: "Anonymous visitor",
        userRef: null,
        profileImg: null,
        createdAt: null,
      });
    }
    return {
      postTitle: post.title,
      metric,
      total,
      loggedInCount: loggedIn.length,
      anonymousEstimate,
      items: [...loggedIn, ...anonymous],
    };
  }
  if (metric === "respects") {
    const rows = await BlogRespectModel.find({ postId })
      .sort({ createdAt: -1 })
      .limit(cap)
      .populate({ path: "userId", select: "username fullName profileImg" })
      .lean();
    const items: AdminBlogEngagementRow[] = rows.map((r) => {
      const u = mapUser(
        r.userId as {
          _id?: mongoose.Types.ObjectId;
          username?: string;
          fullName?: string;
          profileImg?: string;
        },
      );
      return {
        id: String(r._id),
        kind: "user",
        ...u,
        createdAt: iso(r.createdAt),
      };
    });
    return {
      postTitle: post.title,
      metric,
      total: post.respectCount ?? items.length,
      items,
    };
  }
  if (metric === "reposts") {
    const rows = await BlogRepostModel.find({ postId })
      .sort({ createdAt: -1 })
      .limit(cap)
      .populate({ path: "userId", select: "username fullName profileImg" })
      .lean();
    const items: AdminBlogEngagementRow[] = rows.map((r) => {
      const u = mapUser(
        r.userId as {
          _id?: mongoose.Types.ObjectId;
          username?: string;
          fullName?: string;
          profileImg?: string;
        },
      );
      return {
        id: String(r._id),
        kind: "user",
        ...u,
        createdAt: iso(r.createdAt),
      };
    });
    return {
      postTitle: post.title,
      metric,
      total: post.repostCount ?? items.length,
      items,
    };
  }
  if (metric === "bookmarks") {
    const rows = await BlogBookmarkModel.find({ postId })
      .sort({ createdAt: -1 })
      .limit(cap)
      .populate({ path: "userId", select: "username fullName profileImg" })
      .lean();
    const items: AdminBlogEngagementRow[] = rows.map((r) => {
      const u = mapUser(
        r.userId as {
          _id?: mongoose.Types.ObjectId;
          username?: string;
          fullName?: string;
          profileImg?: string;
        },
      );
      return {
        id: String(r._id),
        kind: "user",
        ...u,
        createdAt: iso(r.createdAt),
      };
    });
    return {
      postTitle: post.title,
      metric,
      total: post.bookmarkCount ?? items.length,
      items,
    };
  }
  if (metric === "comments") {
    const rows = await BlogCommentModel.find({ postId, parentId: null })
      .sort({ createdAt: -1 })
      .limit(cap)
      .populate({ path: "userId", select: "username fullName profileImg" })
      .lean();
    const items: AdminBlogEngagementRow[] = rows.map((r) => {
      const u = mapUser(
        r.userId as {
          _id?: mongoose.Types.ObjectId;
          username?: string;
          fullName?: string;
          profileImg?: string;
        },
      );
      const preview = r.text?.trim().slice(0, 200) ?? "";
      return {
        id: String(r._id),
        kind: "user",
        ...u,
        createdAt: iso(r.createdAt),
        textPreview: preview || undefined,
      };
    });
    return {
      postTitle: post.title,
      metric,
      total: post.commentCount ?? items.length,
      items,
    };
  }
  return null;
}
