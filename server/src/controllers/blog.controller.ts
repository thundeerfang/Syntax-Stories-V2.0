import { Request, Response } from "express";
import mongoose from "mongoose";
import type { AuthUser } from "../middlewares/auth/index.js";
import type { RequestWithOptionalAuth } from "../middlewares/auth/optionalVerifyToken.js";
import {
  sanitizeThumbnailUrl,
  validateBlogPostContent,
} from "../modules/blog/blogContentValidation.js";
import { BlogPostModel, type IBlogPost } from "../models/BlogPost.js";
import { UserModel, normalizeProfileImg } from "../models/User.js";
import { normalizeTaxonomyInput } from "../modules/blog/postTaxonomy.js";
import {
  mapLastEditor,
  mapLeanPostToFeedListItem,
  mapLeanSquadForFeed,
  mapTaxonomyFromDoc,
  normalizeBlogCounter,
  type FeedListItem,
  type TaxonomyFields,
} from "../modules/blog/blogFeed.mapper.js";
import {
  applyEditablePostFields,
  applyRequestedSquadAssignment,
  createPostWithSlugRetries,
  ensureSquadPostAllowed,
  forkPublishedPostToDraft,
  hasBlogTaxonomyKeys,
  isDuplicateKeyError,
  isEligibleForPublicRespect,
  mapWritePostResponse,
  parseNullableSquadId,
  postSquadId,
  publishedToDraftForkRequested,
  resolveSlugForTitleUpdate,
  slugify,
  slugWithCollisionSuffix,
  syncPostEngagementEligibility,
  taxonomyWriteFields,
} from "../modules/blog/blogWrite.helpers.js";
import {
  commitReadViewInRedis,
  createReadViewSession,
  findPublishedReadPost,
  findReadViewAuthor,
  handleInvalidReadViewCommit,
  handleMissingReadViewSession,
  readViewPathParams,
  readViewSessionId,
  upsertReadDayAndBumpLongest,
  validateReadViewDwell,
  validateReadViewSessionOwnership,
} from "../modules/blog/blogReadView.helpers.js";
import { getRedis } from "../config/redis.js";
import { redisKeys } from "../shared/redis/keys.js";
import { NOT_DELETED_FILTER } from "../shared/db/notDeleted.js";
import {
  assertTodayIsNextUtcDayAfterYesterday,
  previousUtcCalendarDay,
  streakUtcDayBucket,
} from "../streak/calendarUtc.js";
import {
  MIN_READ_COMMIT_DWELL_MS,
  SOFT_DELETE_RETENTION_MS,
} from "../variable/constants.js";
import { incrementReadStreakMetric } from "../services/readStreakMetrics.js";
import { consumeReadViewStartRateLimit } from "../services/readStreakRateLimit.js";
import { syncReadStreakRedisAfterMongoUpsert } from "../services/readStreakRedis.js";
import {
  deleteAllBookmarksForPost,
  deleteAllRepostsForPost,
  resumeRepostBookmarkContributionsForPost,
  suspendRepostBookmarkContributionsForPost,
  viewerBookmarkStatesForPosts,
  viewerRepostStatesForPosts,
} from "../services/blogEngagement.service.js";
import {
  deleteAllRespectsForPost,
  normalizeRespectCount,
  resumeRespectContributionsForPost,
  suspendRespectContributionsForPost,
  viewerRespectStatesForPosts,
} from "../services/blogRespect.service.js";
import { publishBlogPostStatsSnapshot } from "../services/blogStatsPublish.service.js";
import { fanoutNewPublishedPost } from "../services/notifications/notificationFanout.service.js";
import { attachAchievementsToResponse } from "../services/achievements/achievementEngine.service.js";
import { dispatchAchievementEvents } from "../services/achievements/dispatchAchievementEvents.js";
import { estimateReadMinutesFromBlogFields } from "../modules/blog/readTimeEstimate.js";
import { BLOG_LIMITS } from "@syntax-stories/shared";
async function respondReadCommit(
  res: Response,
  readerId: string,
  status: number,
  body: Record<string, unknown>,
): Promise<void> {
  const shouldAward =
    body.counted === true &&
    body.alreadyProcessed !== true &&
    body.success !== false;
  if (!shouldAward) {
    res.status(status).json(body);
    return;
  }
  const newlyUnlocked = await dispatchAchievementEvents(readerId, [
    { type: "brief_read" },
  ]);
  res.status(status).json(attachAchievementsToResponse(body, newlyUnlocked));
}
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}
const SUMMARY_MAX_LEN = BLOG_LIMITS.summaryMaxLen;
function optionalViewerId(req: Request): string | undefined {
  return (req as RequestWithOptionalAuth).authUser?._id;
}
function engagementCountsFromPostDoc(doc: Record<string, unknown>) {
  return {
    respectCount: normalizeRespectCount(
      (
        doc as {
          respectCount?: number;
        }
      ).respectCount,
    ),
    repostCount: normalizeBlogCounter(
      (
        doc as {
          repostCount?: number;
        }
      ).repostCount,
    ),
    bookmarkCount: normalizeBlogCounter(
      (
        doc as {
          bookmarkCount?: number;
        }
      ).bookmarkCount,
    ),
    commentCount: normalizeBlogCounter(
      (
        doc as {
          commentCount?: number;
        }
      ).commentCount,
    ),
  };
}
async function attachViewerEngagementToMyPosts<
  T extends {
    _id: unknown;
  },
>(
  req: Request,
  posts: T[],
): Promise<
  Array<
    T & {
      viewerHasRespected: boolean;
      viewerHasReposted: boolean;
      viewerHasBookmarked: boolean;
    }
  >
> {
  const viewerId = optionalViewerId(req);
  if (!viewerId || !posts.length) {
    return posts.map((p) => ({
      ...p,
      viewerHasRespected: false,
      viewerHasReposted: false,
      viewerHasBookmarked: false,
    }));
  }
  const ids = posts.map((p) => String(p._id));
  const [viewerMap, repostMap, bookmarkMap] = await Promise.all([
    viewerRespectStatesForPosts(viewerId, ids),
    viewerRepostStatesForPosts(viewerId, ids),
    viewerBookmarkStatesForPosts(viewerId, ids),
  ]);
  return posts.map((p) => {
    const id = String(p._id);
    return {
      ...p,
      viewerHasRespected: !!viewerMap[id],
      viewerHasReposted: !!repostMap[id],
      viewerHasBookmarked: !!bookmarkMap[id],
    };
  });
}
async function applyViewerStateToFeedItems(
  req: Request,
  items: FeedListItem[],
): Promise<FeedListItem[]> {
  const viewerId = optionalViewerId(req);
  if (!viewerId || !items.length) {
    return items;
  }
  const ids = items.map((i) => i._id);
  const [viewerMap, repostMap, bookmarkMap] = await Promise.all([
    viewerRespectStatesForPosts(viewerId, ids),
    viewerRepostStatesForPosts(viewerId, ids),
    viewerBookmarkStatesForPosts(viewerId, ids),
  ]);
  return items.map((it) => ({
    ...it,
    viewerHasRespected: !!viewerMap[it._id],
    viewerHasReposted: !!repostMap[it._id],
    viewerHasBookmarked: !!bookmarkMap[it._id],
  }));
}
export async function createPost(req: Request, res: Response): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const { title, summary, content, thumbnailUrl, status } = req.body as {
      title?: string;
      summary?: string;
      content?: string;
      thumbnailUrl?: string;
      status?: "draft" | "published";
      category?: unknown;
      tags?: unknown;
      language?: unknown;
    };
    const tax = normalizeTaxonomyInput(
      req.body as {
        category?: unknown;
        categories?: unknown;
        tags?: unknown;
        language?: unknown;
      },
    );
    const titleStr = typeof title === "string" ? title.trim() : "";
    const contentStr = typeof content === "string" ? content : "";
    if (!titleStr || titleStr.length > 300) {
      res
        .status(400)
        .json({
          success: false,
          message: "Title is required and must be at most 300 characters",
        });
      return;
    }
    const contentCheck = validateBlogPostContent(contentStr);
    if (!contentCheck.ok) {
      res
        .status(contentCheck.status)
        .json({ success: false, message: contentCheck.message });
      return;
    }
    const baseSlug = slugify(titleStr);
    const finalStatus = status === "published" ? "published" : "draft";
    const thumb = sanitizeThumbnailUrl(thumbnailUrl);
    const summaryStr =
      typeof summary === "string"
        ? summary.trim().slice(0, SUMMARY_MAX_LEN)
        : "";
    const rawSquad = (
      req.body as {
        squadId?: unknown;
      }
    ).squadId;
    let squadOid: mongoose.Types.ObjectId | undefined;
    if (rawSquad != null && rawSquad !== "") {
      const parsedSquad = parseNullableSquadId(rawSquad);
      if (!parsedSquad.ok || parsedSquad.value == null) {
        res.status(400).json({ success: false, message: "Invalid squadId" });
        return;
      }
      squadOid = parsedSquad.value;
      if (!(await ensureSquadPostAllowed(res, squadOid, user._id))) return;
    }
    const { post, lastErr } = await createPostWithSlugRetries(
      baseSlug,
      (slug) => ({
          authorId: user._id,
          title: titleStr,
          slug,
          summary: summaryStr || undefined,
          content: contentCheck.normalizedJson,
          thumbnailUrl: thumb,
          status: finalStatus,
          ...(finalStatus === "published" ? { publishedAt: new Date() } : {}),
          ...taxonomyWriteFields(tax),
          ...(squadOid ? { squadId: squadOid } : {}),
        }),
    );
    if (!post) {
      if (isDuplicateKeyError(lastErr)) {
        res.status(409).json({
          success: false,
          message:
            "Could not allocate a unique URL slug. Try a slightly different title.",
        });
        return;
      }
      throw lastErr;
    }
    const pSquad = postSquadId(post);
    if (finalStatus === "published") {
      void fanoutNewPublishedPost({
        postId: String(post._id),
        authorId: String(user._id),
        title: post.title,
        slug: post.slug,
        category: tax.category,
        tags: tax.tags,
        squadId: pSquad ? String(pSquad) : undefined,
      });
    }
    res.status(201).json({
      success: true,
      post: mapWritePostResponse(post),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create post" });
  }
}
export async function upsertDraft(req: Request, res: Response): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const { title, summary, content, thumbnailUrl } = req.body as {
      title?: string;
      summary?: string;
      content?: string;
      thumbnailUrl?: string;
    };
    const rawBody = req.body as Record<string, unknown>;
    const hasTaxonomyKeys = hasBlogTaxonomyKeys(rawBody);
    const tax = hasTaxonomyKeys ? normalizeTaxonomyInput(rawBody) : null;
    let draftSquadId: mongoose.Types.ObjectId | null | undefined = undefined;
    if ("squadId" in rawBody) {
      const parsedSquad = parseNullableSquadId(rawBody.squadId);
      if (!parsedSquad.ok) {
        res.status(400).json({ success: false, message: "Invalid squadId" });
        return;
      }
      draftSquadId = parsedSquad.value;
    }
    const titleStr = typeof title === "string" ? title.trim() : "";
    const contentStr = typeof content === "string" ? content : "";
    const summaryStr =
      typeof summary === "string"
        ? summary.trim().slice(0, SUMMARY_MAX_LEN)
        : "";
    const contentCheck = validateBlogPostContent(contentStr);
    if (!contentCheck.ok) {
      res
        .status(contentCheck.status)
        .json({ success: false, message: contentCheck.message });
      return;
    }
    const thumb = sanitizeThumbnailUrl(thumbnailUrl);
    const finalTitle = titleStr || "Untitled draft";
    const post = await BlogPostModel.findOne({
      authorId: user._id,
      status: "draft",
      ...NOT_DELETED_FILTER,
    })
      .sort({ updatedAt: -1 })
      .limit(1)
      .lean();
    if (post) {
      const slug = slugify(finalTitle);
      const prevSq = (
        post as {
          squadId?: mongoose.Types.ObjectId | null;
        }
      ).squadId;
      const effectiveSq: mongoose.Types.ObjectId | null | undefined =
        draftSquadId !== undefined ? draftSquadId : (prevSq ?? null);
      if (!(await ensureSquadPostAllowed(res, effectiveSq, user._id))) return;
      const patch: Record<string, unknown> = {
        title: finalTitle,
        slug,
        summary: summaryStr || undefined,
        content: contentCheck.normalizedJson,
        thumbnailUrl: thumb,
        ...(tax ? taxonomyWriteFields(tax) : {}),
      };
      if (draftSquadId !== undefined) {
        patch.squadId = draftSquadId;
      }
      const updated = await BlogPostModel.findByIdAndUpdate(post._id, patch, {
        new: true,
      });
      if (!updated) {
        res.status(404).json({ success: false, message: "Draft not found" });
        return;
      }
      res.status(200).json({
        success: true,
        post: mapWritePostResponse(updated as unknown as Record<string, unknown>),
      });
      return;
    }
    if (!(await ensureSquadPostAllowed(res, draftSquadId, user._id))) return;
    const uniqueSlug = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const created = await BlogPostModel.create({
      authorId: user._id,
      title: finalTitle,
      slug: uniqueSlug,
      summary: summaryStr || undefined,
      content: contentCheck.normalizedJson,
      thumbnailUrl: thumb,
      status: "draft",
      ...(draftSquadId ? { squadId: draftSquadId } : {}),
      ...(tax ? taxonomyWriteFields(tax) : { language: "en" }),
    });
    res.status(201).json({
      success: true,
      post: mapWritePostResponse(created as unknown as Record<string, unknown>),
    });
  } catch (err) {
    const e = err as {
      code?: number;
    };
    if (e.code === 11000) {
      res
        .status(409)
        .json({
          success: false,
          message: "Draft slug conflict. Try a different title.",
        });
      return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to save draft" });
  }
}
export async function getDraft(req: Request, res: Response): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const draft = await BlogPostModel.findOne({
      authorId: user._id,
      status: "draft",
      ...NOT_DELETED_FILTER,
    })
      .sort({ updatedAt: -1 })
      .limit(1)
      .lean();
    if (!draft) {
      res.status(200).json({ success: true, draft: null });
      return;
    }
    res.status(200).json({
      success: true,
      draft: {
        _id: draft._id,
        title: draft.title,
        slug: draft.slug,
        summary: (
          draft as {
            summary?: string;
          }
        ).summary,
        content: draft.content,
        thumbnailUrl: (
          draft as {
            thumbnailUrl?: string;
          }
        ).thumbnailUrl,
        status: draft.status,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        ...mapTaxonomyFromDoc(draft as TaxonomyFields),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to get draft" });
  }
}
export async function listPublishedFeed(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const raw = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(raw) ? Math.min(50, Math.max(1, raw)) : 20;
    const offsetRaw = Number.parseInt(String(req.query.offset ?? ""), 10);
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
    const tagRaw =
      typeof req.query.tag === "string"
        ? req.query.tag.trim().toLowerCase()
        : "";
    const categoryRaw =
      typeof req.query.category === "string"
        ? req.query.category.trim().toLowerCase()
        : "";
    const sortRaw =
      typeof req.query.sort === "string"
        ? req.query.sort.trim().toLowerCase()
        : "";
    const monthRaw =
      typeof req.query.month === "string" ? req.query.month.trim() : "";
    const filter: Record<string, unknown> = {
      status: "published",
      ...NOT_DELETED_FILTER,
    };
    if (tagRaw) filter.tags = tagRaw;
    if (categoryRaw) filter.category = categoryRaw;
    if (/^\d{4}-\d{2}$/.test(monthRaw)) {
      const [ys, ms] = monthRaw.split("-");
      const y = Number.parseInt(ys ?? "", 10);
      const mo = Number.parseInt(ms ?? "", 10);
      if (Number.isFinite(y) && mo >= 1 && mo <= 12) {
        const start = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(y, mo, 1, 0, 0, 0, 0));
        filter.$or = [
          { publishedAt: { $gte: start, $lt: end } },
          {
            $and: [
              {
                $or: [
                  { publishedAt: { $exists: false } },
                  { publishedAt: null },
                ],
              },
              { createdAt: { $gte: start, $lt: end } },
            ],
          },
        ];
      }
    }
    const sort: Record<string, 1 | -1> =
      sortRaw === "views"
        ? { viewCount: -1, updatedAt: -1 }
        : { updatedAt: -1 };
    const posts = await BlogPostModel.find(filter)
      .sort(sort)
      .skip(offset)
      .limit(limit + 1)
      .populate({
        path: "authorId",
        select: "username fullName profileImg",
        model: "users",
      })
      .populate({
        path: "lastEditedById",
        select: "username fullName",
        model: "users",
      })
      .populate({
        path: "squadId",
        select: "slug name iconUrl visibility coverBannerUrl memberCount",
        model: "squads",
      })
      .lean();
    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;
    const items = page
      .map(mapLeanPostToFeedListItem)
      .filter((x): x is FeedListItem => x !== null);
    const postsOut = await applyViewerStateToFeedItems(req, items);
    res.status(200).json({ success: true, posts: postsOut, hasMore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load feed" });
  }
}
export async function listUserPublishedPosts(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const usernameParam = paramString(req.params.username);
    if (!usernameParam?.trim()) {
      res.status(400).json({ success: false, message: "Invalid username" });
      return;
    }
    const raw = Number.parseInt(String(req.query.limit ?? ""), 10);
    const limit = Number.isFinite(raw) ? Math.min(50, Math.max(1, raw)) : 24;
    const user = await UserModel.findOne({
      username: new RegExp(`^${escapeRegex(usernameParam.trim())}$`, "i"),
    })
      .select("_id")
      .lean();
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    const posts = await BlogPostModel.find({
      authorId: user._id,
      status: "published",
      ...NOT_DELETED_FILTER,
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate({
        path: "authorId",
        select: "username fullName profileImg",
        model: "users",
      })
      .populate({
        path: "lastEditedById",
        select: "username fullName",
        model: "users",
      })
      .populate({
        path: "squadId",
        select: "slug name iconUrl visibility coverBannerUrl memberCount",
        model: "squads",
      })
      .lean();
    const items = posts
      .map(mapLeanPostToFeedListItem)
      .filter((x): x is FeedListItem => x !== null);
    const postsOut = await applyViewerStateToFeedItems(req, items);
    res.status(200).json({ success: true, posts: postsOut });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load posts" });
  }
}
export async function getPublishedPostBySlug(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const usernameParam = paramString(req.params.username);
    const slugRaw = paramString(req.params.slug);
    const slug = slugRaw?.trim() ?? "";
    if (!usernameParam || !slug) {
      res.status(400).json({ success: false, message: "Invalid path" });
      return;
    }
    const user = await UserModel.findOne({
      username: new RegExp(`^${escapeRegex(usernameParam)}$`, "i"),
    })
      .select("_id")
      .lean();
    if (!user) {
      res.status(404).json({ success: false, message: "Author not found" });
      return;
    }
    const viewerId = optionalViewerId(req);
    let post = await BlogPostModel.findOne({
      authorId: user._id,
      slug,
      status: "published",
      ...NOT_DELETED_FILTER,
    })
      .populate({
        path: "authorId",
        select: "username fullName profileImg",
        model: "users",
      })
      .populate({
        path: "lastEditedById",
        select: "username fullName",
        model: "users",
      })
      .populate({
        path: "squadId",
        select: "slug name iconUrl visibility coverBannerUrl memberCount",
        model: "squads",
      })
      .lean();
    if (!post && viewerId && viewerId === String(user._id)) {
      post = await BlogPostModel.findOne({
        authorId: user._id,
        slug,
        status: "suspended",
        ...NOT_DELETED_FILTER,
      })
        .populate({
          path: "authorId",
          select: "username fullName profileImg",
          model: "users",
        })
        .populate({
          path: "lastEditedById",
          select: "username fullName",
          model: "users",
        })
        .populate({
          path: "squadId",
          select: "slug name iconUrl visibility coverBannerUrl memberCount",
          model: "squads",
        })
        .lean();
    }
    if (!post) {
      res.status(404).json({ success: false, message: "Post not found" });
      return;
    }
    const aRaw = post.authorId as unknown;
    if (!aRaw || typeof aRaw !== "object" || Array.isArray(aRaw)) {
      res.status(404).json({ success: false, message: "Post not found" });
      return;
    }
    const a = aRaw as {
      username: string;
      fullName?: string;
      profileImg?: string;
    };
    const leAt = (
      post as {
        lastEditedAt?: Date;
      }
    ).lastEditedAt;
    const leBy = mapLastEditor(
      (
        post as {
          lastEditedById?: unknown;
        }
      ).lastEditedById,
    );
    const squadDetail = mapLeanSquadForFeed(
      (
        post as {
          squadId?: unknown;
        }
      ).squadId,
    );
    const postIdStr = String(post._id);
    const respectCount = normalizeRespectCount(
      (
        post as {
          respectCount?: number;
        }
      ).respectCount,
    );
    const repostCount = normalizeBlogCounter(
      (
        post as {
          repostCount?: number;
        }
      ).repostCount,
    );
    const bookmarkCount = normalizeBlogCounter(
      (
        post as {
          bookmarkCount?: number;
        }
      ).bookmarkCount,
    );
    const commentCount = normalizeBlogCounter(
      (
        post as {
          commentCount?: number;
        }
      ).commentCount,
    );
    const viewCount = normalizeBlogCounter(
      (
        post as {
          viewCount?: number;
        }
      ).viewCount,
    );
    let viewerHasRespected: boolean | undefined;
    let viewerHasReposted: boolean | undefined;
    let viewerHasBookmarked: boolean | undefined;
    if (viewerId) {
      const [m, rm, bm] = await Promise.all([
        viewerRespectStatesForPosts(viewerId, [postIdStr]),
        viewerRepostStatesForPosts(viewerId, [postIdStr]),
        viewerBookmarkStatesForPosts(viewerId, [postIdStr]),
      ]);
      viewerHasRespected = !!m[postIdStr];
      viewerHasReposted = !!rm[postIdStr];
      viewerHasBookmarked = !!bm[postIdStr];
    }
    res.status(200).json({
      success: true,
      post: {
        _id: postIdStr,
        title: post.title,
        slug: post.slug,
        summary:
          (
            post as {
              summary?: string;
            }
          ).summary ?? "",
        content: post.content,
        thumbnailUrl: (
          post as {
            thumbnailUrl?: string;
          }
        ).thumbnailUrl,
        status: post.status,
        moderationSuspended: post.status === "suspended",
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        lastEditedAt: leAt ? leAt.toISOString() : undefined,
        lastEditedBy: leBy,
        respectCount,
        repostCount,
        bookmarkCount,
        commentCount,
        viewCount,
        ...(viewerId
          ? {
              viewerHasRespected: !!viewerHasRespected,
              viewerHasReposted: !!viewerHasReposted,
              viewerHasBookmarked: !!viewerHasBookmarked,
            }
          : {}),
        author: {
          username: a.username,
          fullName: a.fullName?.trim() ? a.fullName : a.username,
          profileImg: normalizeProfileImg(a.profileImg),
        },
        ...mapTaxonomyFromDoc(post as TaxonomyFields),
        ...(squadDetail ? { squad: squadDetail } : {}),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load post" });
  }
}
export async function recordBlogReadDay(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authUser = (
      req as Request & {
        user?: AuthUser;
      }
    ).user;
    if (!authUser?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const { usernameParam, slug } = readViewPathParams(req);
    if (!usernameParam || !slug) {
      res.status(400).json({ success: false, message: "Invalid path" });
      return;
    }
    const author = await findReadViewAuthor(usernameParam);
    if (!author) {
      res.status(404).json({ success: false, message: "Author not found" });
      return;
    }
    const readerId = new mongoose.Types.ObjectId(authUser._id);
    const authorId = author._id;
    if (readerId.equals(authorId)) {
      res.status(200).json({ success: true, counted: false, reason: "self" });
      return;
    }
    const post = await findPublishedReadPost({ authorId, slug });
    if (!post) {
      res.status(404).json({ success: false, message: "Post not found" });
      return;
    }
    const now = new Date();
    const dayBucket = streakUtcDayBucket(now);
    await upsertReadDayAndBumpLongest(readerId, dayBucket, now);
    const redis = getRedis();
    if (redis) {
      void syncReadStreakRedisAfterMongoUpsert({
        redis,
        readerId,
        dayBucket,
        now,
      }).catch((e) => console.error("[read-streak] redis sync failed", e));
    }
    res.status(200).json({ success: true, counted: true, dayBucket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to record read" });
  }
}
export async function startBlogReadView(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) {
      res.status(503).json({
        success: false,
        code: "READ_STREAK_REDIS_UNAVAILABLE",
        message: "Read view session requires Redis",
      });
      return;
    }
    const authUser = (
      req as Request & {
        user?: AuthUser;
      }
    ).user;
    if (!authUser?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const { usernameParam, slug } = readViewPathParams(req);
    if (!usernameParam || !slug) {
      res.status(400).json({ success: false, message: "Invalid path" });
      return;
    }
    const author = await findReadViewAuthor(usernameParam);
    if (!author) {
      res.status(404).json({ success: false, message: "Author not found" });
      return;
    }
    const readerId = new mongoose.Types.ObjectId(authUser._id);
    const authorId = author._id;
    if (readerId.equals(authorId)) {
      res.status(200).json({
        success: true,
        sessionId: null,
        reason: "self",
        minDwellMs: MIN_READ_COMMIT_DWELL_MS,
      });
      return;
    }
    const post = await findPublishedReadPost({ authorId, slug });
    if (!post) {
      res.status(404).json({ success: false, message: "Post not found" });
      return;
    }
    const underLimit = await consumeReadViewStartRateLimit(
      redis,
      String(readerId),
    );
    if (!underLimit) {
      incrementReadStreakMetric("readViewStartRateLimited");
      res.status(429).json({
        success: false,
        code: "READ_VIEW_START_RATE_LIMIT",
        message: "Too many read sessions; try again in a minute",
      });
      return;
    }
    const sessionId = await createReadViewSession({
      redis,
      readerId,
      postId: post._id,
    });
    res
      .status(200)
      .json({ success: true, sessionId, minDwellMs: MIN_READ_COMMIT_DWELL_MS });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to start read view" });
  }
}
export async function commitBlogReadView(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) {
      res.status(503).json({
        success: false,
        code: "READ_STREAK_REDIS_UNAVAILABLE",
        message: "Read view commit requires Redis",
      });
      return;
    }
    const authUser = (
      req as Request & {
        user?: AuthUser;
      }
    ).user;
    if (!authUser?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const { usernameParam, slug } = readViewPathParams(req);
    const sessionId = readViewSessionId(req.body);
    if (!usernameParam || !slug || !sessionId) {
      res
        .status(400)
        .json({ success: false, message: "Invalid path or sessionId" });
      return;
    }
    const author = await findReadViewAuthor(usernameParam);
    if (!author) {
      res.status(404).json({ success: false, message: "Author not found" });
      return;
    }
    const readerId = new mongoose.Types.ObjectId(authUser._id);
    const authorId = author._id;
    if (readerId.equals(authorId)) {
      res.status(200).json({ success: true, counted: false, reason: "self" });
      return;
    }
    const sk = redisKeys.readStreak.viewSession(sessionId);
    const ackKey = redisKeys.readStreak.viewCommitAck(
      String(readerId),
      sessionId,
    );
    const [su, sp, startTimeRaw] = await Promise.all([
      redis.hGet(sk, "userId"),
      redis.hGet(sk, "postId"),
      redis.hGet(sk, "startTime"),
    ]);
    if (!su || !sp) {
      await handleMissingReadViewSession({ res, redis, ackKey, readerId });
      return;
    }
    if (!validateReadViewSessionOwnership({ res, sessionUserId: su, readerId })) {
      return;
    }
    if (!validateReadViewDwell(res, startTimeRaw ?? undefined)) {
      return;
    }
    const postOk = await findPublishedReadPost({ authorId, slug, postId: sp });
    if (!postOk) {
      res.status(400).json({ success: false, reason: "invalid_post" });
      return;
    }
    const now = new Date();
    const today = streakUtcDayBucket(now);
    const yesterday = previousUtcCalendarDay(today);
    assertTodayIsNextUtcDayAfterYesterday(today, yesterday);
    const streakKey = redisKeys.readStreak.dailyHash(String(readerId));
    const lastDayRedis = await redis.hGet(streakKey, "lastDay");
    if (lastDayRedis && today < lastDayRedis) {
      console.error("[read-streak] STREAK_MONOTONICITY_BROKEN", {
        readerId: String(readerId),
        today,
        lastDayRedis,
      });
      res
        .status(500)
        .json({ success: false, code: "STREAK_MONOTONICITY_BROKEN" });
      return;
    }
    await upsertReadDayAndBumpLongest(readerId, today, now);
    const zKey = redisKeys.readStreak.readDaysZset(String(readerId));
    let out;
    try {
      out = await commitReadViewInRedis({
        redis,
        sessionKey: sk,
        streakKey,
        zKey,
        ackKey,
        today,
        yesterday,
        now,
        readerId,
        postId: sp,
      });
    } catch (e) {
      console.error("[read-streak] merged lua failed after mongo upsert", e);
      incrementReadStreakMetric("readViewCommitRedisFail");
      await respondReadCommit(res, String(readerId), 200, {
        success: true,
        counted: true,
        dayBucket: today,
        redisApplied: false,
      });
      return;
    }
    if (out.status === 2) {
      res
        .status(200)
        .json({
          success: true,
          counted: true,
          alreadyProcessed: true,
          dayBucket: today,
        });
      return;
    }
    if (out.status === 1 || out.status === 0) {
      const postOid = new mongoose.Types.ObjectId(sp);
      await BlogPostModel.updateOne(
        { _id: postOid },
        { $inc: { viewCount: 1 } },
      );
      void publishBlogPostStatsSnapshot(postOid);
      await respondReadCommit(res, String(readerId), 200, {
        success: true,
        counted: true,
        dayBucket: today,
        streak: { current: out.current, longest: out.longest },
      });
      return;
    }
    if (out.status === -3) {
      res
        .status(409)
        .json({ success: false, code: "STREAK_DAY_NON_MONOTONIC" });
      return;
    }
    if (out.status === -1) {
      await handleInvalidReadViewCommit({ res, readerId, dayBucket: today });
      return;
    }
    res
      .status(500)
      .json({ success: false, message: "Unexpected commit status" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to commit read view" });
  }
}
export async function listMyPosts(req: Request, res: Response): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const status = (req.query.status as string) || undefined;
    const cutoff = new Date(Date.now() - SOFT_DELETE_RETENTION_MS);
    if (status === "deleted") {
      const posts = await BlogPostModel.find({
        authorId: user._id,
        deletedAt: { $exists: true, $ne: null, $gte: cutoff },
      })
        .select(
          "title slug summary content thumbnailUrl status createdAt updatedAt deletedAt lastEditedAt category tags language respectCount repostCount bookmarkCount commentCount",
        )
        .populate({
          path: "lastEditedById",
          select: "username fullName",
          model: "users",
        })
        .sort({ deletedAt: -1 })
        .limit(50)
        .lean();
      const deletedMapped = posts.map((p) => {
        const leAt = (
          p as {
            lastEditedAt?: Date;
          }
        ).lastEditedAt;
        const leBy = mapLastEditor(
          (
            p as {
              lastEditedById?: unknown;
            }
          ).lastEditedById,
        );
        const delAt = (
          p as {
            deletedAt?: Date;
          }
        ).deletedAt;
        const doc = p as Record<string, unknown>;
        return {
          _id: p._id,
          title: p.title,
          slug: p.slug,
          summary: (
            p as {
              summary?: string;
            }
          ).summary,
          content: p.content,
          thumbnailUrl: (
            p as {
              thumbnailUrl?: string;
            }
          ).thumbnailUrl,
          status: p.status,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          deletedAt: delAt ? delAt.toISOString() : undefined,
          lastEditedAt: leAt ? leAt.toISOString() : undefined,
          lastEditedBy: leBy,
          ...mapTaxonomyFromDoc(p as TaxonomyFields),
          ...engagementCountsFromPostDoc(doc),
        };
      });
      res.status(200).json({
        success: true,
        posts: deletedMapped,
      });
      return;
    }
    const filter: Record<string, unknown> = {
      authorId: user._id,
      ...NOT_DELETED_FILTER,
    };
    if (
      status === "draft" ||
      status === "published" ||
      status === "suspended"
    ) {
      filter.status = status;
    }
    const posts = await BlogPostModel.find(filter)
      .select(
        "title slug summary content thumbnailUrl status createdAt updatedAt lastEditedAt category tags language respectCount repostCount bookmarkCount commentCount squadId",
      )
      .populate({
        path: "lastEditedById",
        select: "username fullName",
        model: "users",
      })
      .populate({
        path: "squadId",
        select: "slug name iconUrl visibility coverBannerUrl memberCount",
        model: "squads",
      })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
    const mapped = posts.map((p) => {
      const leAt = (
        p as {
          lastEditedAt?: Date;
        }
      ).lastEditedAt;
      const leBy = mapLastEditor(
        (
          p as {
            lastEditedById?: unknown;
          }
        ).lastEditedById,
      );
      const summary =
        (
          p as {
            summary?: string;
          }
        ).summary ?? "";
      const content = (
        p as {
          content?: string;
        }
      ).content;
      const doc = p as Record<string, unknown>;
      const squad = mapLeanSquadForFeed(doc.squadId);
      return {
        _id: p._id,
        title: p.title,
        slug: p.slug,
        summary,
        content,
        thumbnailUrl: (
          p as {
            thumbnailUrl?: string;
          }
        ).thumbnailUrl,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        lastEditedAt: leAt ? leAt.toISOString() : undefined,
        lastEditedBy: leBy,
        readTimeMinutes: estimateReadMinutesFromBlogFields(content, summary),
        ...mapTaxonomyFromDoc(p as TaxonomyFields),
        ...engagementCountsFromPostDoc(doc),
        ...(squad ? { squad } : {}),
      };
    });
    const postsOut =
      status === "published"
        ? await attachViewerEngagementToMyPosts(req, mapped)
        : mapped;
    res.status(200).json({
      success: true,
      posts: postsOut,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to list posts" });
  }
}
export async function getMyPostById(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const postId = paramString(req.params.postId);
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      res.status(400).json({ success: false, message: "Invalid post id" });
      return;
    }
    const post = await BlogPostModel.findOne({
      _id: postId,
      authorId: user._id,
      ...NOT_DELETED_FILTER,
    }).lean();
    if (!post) {
      res.status(404).json({ success: false, message: "Post not found" });
      return;
    }
    res.status(200).json({
      success: true,
      post: {
        _id: String(post._id),
        title: post.title,
        slug: post.slug,
        summary:
          (
            post as {
              summary?: string;
            }
          ).summary ?? "",
        content: post.content,
        thumbnailUrl: (
          post as {
            thumbnailUrl?: string;
          }
        ).thumbnailUrl,
        status: post.status,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        ...((
          post as {
            squadId?: mongoose.Types.ObjectId;
          }
        ).squadId
          ? {
              squadId: String(
                (
                  post as {
                    squadId?: mongoose.Types.ObjectId;
                  }
                ).squadId,
              ),
            }
          : {}),
        ...mapTaxonomyFromDoc(post as TaxonomyFields),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load post" });
  }
}
export async function updateMyPost(req: Request, res: Response): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const postId = paramString(req.params.postId);
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      res.status(400).json({ success: false, message: "Invalid post id" });
      return;
    }
    const existing = await BlogPostModel.findOne({
      _id: postId,
      authorId: user._id,
    });
    if (!existing) {
      res.status(404).json({ success: false, message: "Post not found" });
      return;
    }
    const wasEligibleRespect = isEligibleForPublicRespect(existing);
    const wasPublishedBefore = existing.status === "published";
    const rawBody = req.body as Record<string, unknown>;
    const hasTaxonomyKeys = hasBlogTaxonomyKeys(rawBody);
    const tax = hasTaxonomyKeys ? normalizeTaxonomyInput(rawBody) : null;
    const { title, summary, content, thumbnailUrl, status, silent } =
      req.body as {
        title?: string;
        summary?: string;
        content?: string;
        thumbnailUrl?: string;
        status?: "draft" | "published";
        silent?: boolean;
      };
    const titleStr =
      typeof title === "string" && title.trim()
        ? title.trim().slice(0, 300)
        : existing.title;
    const contentStr = typeof content === "string" ? content : existing.content;
    const contentCheck = validateBlogPostContent(contentStr);
    if (!contentCheck.ok) {
      res
        .status(contentCheck.status)
        .json({ success: false, message: contentCheck.message });
      return;
    }
    const summaryStr =
      typeof summary === "string"
        ? summary.trim().slice(0, SUMMARY_MAX_LEN)
        : (existing.summary ?? "") || "";
    if (
      publishedToDraftForkRequested({
        status,
        existingStatus: existing.status,
        silent,
      })
    ) {
      const thumb =
        thumbnailUrl !== undefined
          ? sanitizeThumbnailUrl(thumbnailUrl)
          : existing.thumbnailUrl;
      const { post: newPost, lastErr } = await forkPublishedPostToDraft({
        userId: user._id,
        existing,
        title: titleStr,
        summary: summaryStr,
        content: contentCheck.normalizedJson,
        thumbnailUrl: thumb,
        tax,
        hasTaxonomyKeys,
      });
      if (!newPost) {
        if (isDuplicateKeyError(lastErr)) {
          res.status(409).json({
            success: false,
            message:
              "Could not allocate a unique URL slug. Try a slightly different title.",
          });
          return;
        }
        throw lastErr;
      }
      res.status(201).json({
        success: true,
        forkedFromPublished: true,
        post: mapWritePostResponse(newPost),
      });
      return;
    }
    const squadAssignment = applyRequestedSquadAssignment({
      existing,
      rawBody,
      wasPublishedBefore,
    });
    if (!squadAssignment.ok) {
      res.status(squadAssignment.status).json({
        success: false,
        message: squadAssignment.message,
      });
      return;
    }
    const nextSlug = await resolveSlugForTitleUpdate({
      existing,
      userId: user._id,
      title,
      titleStr,
    });
    applyEditablePostFields({
      existing,
      userId: user._id,
      title: titleStr,
      slug: nextSlug,
      summary: summaryStr,
      content: contentCheck.normalizedJson,
      thumbnailUrl,
      status,
      silent,
      wasPublishedBefore,
      tax,
    });
    if (!(await ensureSquadPostAllowed(res, postSquadId(existing), user._id)))
      return;
    const willBeEligibleRespect = isEligibleForPublicRespect(existing);
    await existing.save();
    await syncPostEngagementEligibility(
      existing,
      wasEligibleRespect,
      willBeEligibleRespect,
    );
    const outSquad = postSquadId(existing);
    const firstPublish = !wasPublishedBefore && existing.status === "published";
    const postBody = {
      success: true,
      post: mapWritePostResponse(existing),
    };
    if (firstPublish) {
      void fanoutNewPublishedPost({
        postId: String(existing._id),
        authorId: String(user._id),
        title: existing.title,
        slug: existing.slug,
        category: existing.category,
        tags: existing.tags,
        squadId: outSquad ? String(outSquad) : undefined,
      });
      const newlyUnlocked = await dispatchAchievementEvents(String(user._id), [
        { type: "profile_sync" },
      ]);
      res
        .status(200)
        .json(attachAchievementsToResponse(postBody, newlyUnlocked));
    } else {
      res.status(200).json(postBody);
    }
  } catch (err) {
    const e = err as {
      code?: number;
    };
    if (e.code === 11000) {
      res.status(409).json({ success: false, message: "Slug conflict" });
      return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update post" });
  }
}
export async function restoreMyPost(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const postId = paramString(req.params.postId);
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      res.status(400).json({ success: false, message: "Invalid post id" });
      return;
    }
    const doc = await BlogPostModel.findOne({
      _id: postId,
      authorId: user._id,
      deletedAt: { $exists: true, $ne: null },
    });
    if (!doc) {
      res
        .status(404)
        .json({ success: false, message: "Post not found or not in trash" });
      return;
    }
    const del = doc.deletedAt;
    if (!del || del.getTime() < Date.now() - SOFT_DELETE_RETENTION_MS) {
      res.status(410).json({
        success: false,
        message: "This post is no longer in the recoverable trash window",
      });
      return;
    }
    let nextSlug = doc.slug;
    const clash = await BlogPostModel.findOne({
      authorId: user._id,
      slug: doc.slug,
      ...NOT_DELETED_FILTER,
      _id: { $ne: doc._id },
    })
      .select("_id")
      .lean();
    if (clash) {
      const base = slugify(doc.title);
      for (let attempt = 0; attempt < 12; attempt++) {
        const cand = slugWithCollisionSuffix(base, attempt);
        const c2 = await BlogPostModel.findOne({
          authorId: user._id,
          slug: cand,
          ...NOT_DELETED_FILTER,
        })
          .select("_id")
          .lean();
        if (!c2) {
          nextSlug = cand;
          break;
        }
      }
    }
    doc.deletedAt = undefined;
    doc.deletedById = undefined;
    doc.slug = nextSlug;
    doc.status = "published";
    const restored = doc as IBlogPost;
    if (
      !(restored.publishedAt instanceof Date) ||
      Number.isNaN(restored.publishedAt.getTime())
    ) {
      restored.publishedAt = new Date();
    }
    await doc.save();
    await Promise.all([
      resumeRespectContributionsForPost(
        doc._id as mongoose.Types.ObjectId,
        doc.authorId as mongoose.Types.ObjectId,
      ),
      resumeRepostBookmarkContributionsForPost(
        doc._id as mongoose.Types.ObjectId,
      ),
    ]);
    res.status(200).json({
      success: true,
      post: {
        _id: doc._id,
        title: doc.title,
        slug: doc.slug,
        summary: doc.summary,
        content: doc.content,
        thumbnailUrl: doc.thumbnailUrl,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to restore post" });
  }
}
export async function purgeMyPostPermanently(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const postId = paramString(req.params.postId);
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      res.status(400).json({ success: false, message: "Invalid post id" });
      return;
    }
    const removed = await BlogPostModel.findOneAndDelete({
      _id: postId,
      authorId: user._id,
      deletedAt: { $exists: true, $ne: null },
    });
    if (!removed) {
      res
        .status(404)
        .json({ success: false, message: "Post not found or not in trash" });
      return;
    }
    const pid = removed._id as mongoose.Types.ObjectId;
    await deleteAllRespectsForPost(pid);
    await Promise.all([
      deleteAllRepostsForPost(pid),
      deleteAllBookmarksForPost(pid),
    ]);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to permanently delete post" });
  }
}
export async function deleteMyPost(req: Request, res: Response): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const postId = paramString(req.params.postId);
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      res.status(400).json({ success: false, message: "Invalid post id" });
      return;
    }
    const updated = await BlogPostModel.findOneAndUpdate(
      { _id: postId, authorId: user._id, ...NOT_DELETED_FILTER },
      {
        deletedAt: new Date(),
        deletedById: user._id as unknown as mongoose.Types.ObjectId,
      },
      { new: true },
    );
    if (!updated) {
      res.status(404).json({ success: false, message: "Post not found" });
      return;
    }
    await Promise.all([
      suspendRespectContributionsForPost(
        updated._id as mongoose.Types.ObjectId,
        updated.authorId as mongoose.Types.ObjectId,
      ),
      suspendRepostBookmarkContributionsForPost(
        updated._id as mongoose.Types.ObjectId,
      ),
    ]);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to delete post" });
  }
}
export async function getBlogTaxonomy(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const { listTaxonomyCategoriesPaginated, listTaxonomyTagsPaginated } =
      await import("../services/blogTaxonomy.service.js");
    const [categoriesPage, tagsPage] = await Promise.all([
      listTaxonomyCategoriesPaginated({
        offset: 0,
        limit: 10000,
        sort: "posts-desc",
      }),
      listTaxonomyTagsPaginated({ offset: 0, limit: 80, sort: "posts-desc" }),
    ]);
    const categories = categoriesPage.list;
    const tags = tagsPage.list.map((t) => ({
      slug: t.slug,
      name: t.name,
      description: "",
      postCount: t.postCount,
    }));
    res.status(200).json({ success: true, categories, tags });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load taxonomy" });
  }
}
export async function listBlogTaxonomyCategories(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { listTaxonomyCategoriesPaginated } =
      await import("../services/blogTaxonomy.service.js");
    const page = await listTaxonomyCategoriesPaginated({
      offset: req.query.offset,
      limit: req.query.limit,
      sort: req.query.sort,
      q: req.query.q,
    });
    res.status(200).json({ success: true, ...page });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load categories" });
  }
}
export async function listBlogTagsPaginated(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { listTaxonomyTagsPaginated } =
      await import("../services/blogTaxonomy.service.js");
    const page = await listTaxonomyTagsPaginated({
      offset: req.query.offset,
      limit: req.query.limit,
      sort: req.query.sort,
      q: req.query.q,
    });
    res.status(200).json({ success: true, ...page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load tags" });
  }
}
export async function getBlogTagsExplore(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const { loadExploreTagRankings, mapExploreTagRows } =
      await import("../services/blogTaxonomy.service.js");
    const { nameBySlug, trendingAgg, popularAgg, recentAgg } =
      await loadExploreTagRankings();
    res.status(200).json({
      success: true,
      trending: mapExploreTagRows(trendingAgg, nameBySlug),
      popular: mapExploreTagRows(popularAgg, nameBySlug),
      recent: mapExploreTagRows(recentAgg, nameBySlug, true),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load tags" });
  }
}
export async function buildFeedListItemsForPosts(
  req: Request,
  postDocs: unknown[],
) {
  const items = postDocs
    .map(mapLeanPostToFeedListItem)
    .filter((x): x is FeedListItem => x !== null);
  return applyViewerStateToFeedItems(req, items);
}
