import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import type { AuthUser } from '../middlewares/auth/index.js';
import type { RequestWithOptionalAuth } from '../middlewares/auth/optionalVerifyToken.js';
import {
  sanitizeThumbnailUrl,
  validateBlogPostContent,
} from '../modules/blog/blogContentValidation.js';
import { BlogPostModel, type IBlogPost } from '../models/BlogPost.js';
import { BlogReadDayModel } from '../models/BlogReadDay.js';
import { UserModel, normalizeProfileImg } from '../models/User.js';
import { normalizeTaxonomyInput } from '../modules/blog/postTaxonomy.js';
import { getRedis } from '../config/redis.js';
import { redisKeys } from '../shared/redis/keys.js';
import {
  assertTodayIsNextUtcDayAfterYesterday,
  previousUtcCalendarDay,
} from '../streak/calendarUtc.js';
import {
  MIN_READ_COMMIT_DWELL_MS,
  READ_VIEW_ACK_TTL_SEC,
  READ_VIEW_SESSION_TTL_SEC,
} from '../services/blogReadView.constants.js';
import { bumpReadStreakLongestFromMongo } from '../services/readStreakDurability.service.js';
import { incrementReadStreakMetric } from '../services/readStreakMetrics.js';
import { consumeReadViewStartRateLimit } from '../services/readStreakRateLimit.js';
import { streakUtcDayBucket } from '../services/readStreak.service.js';
import { readDayZsetScoreMs, readDaysTrimMinRetainMsUtc } from '../services/readStreakZset.js';
import { syncReadStreakRedisAfterMongoUpsert } from '../services/readStreakRedis.js';
import { evalReadViewCommitMerged } from '../services/readViewCommitRedis.js';
import { assertCanPostOrShareToSquad } from '../services/squad.service.js';
import {
  deleteAllBookmarksForPost,
  deleteAllRepostsForPost,
  resumeRepostBookmarkContributionsForPost,
  suspendRepostBookmarkContributionsForPost,
  viewerBookmarkStatesForPosts,
  viewerRepostStatesForPosts,
} from '../services/blogEngagement.service.js';
import {
  deleteAllRespectsForPost,
  normalizeRespectCount,
  resumeRespectContributionsForPost,
  suspendRespectContributionsForPost,
  viewerRespectStatesForPosts,
} from '../services/blogRespect.service.js';
import { publishBlogPostStatsSnapshot } from '../services/blogStatsPublish.service.js';
import { fanoutNewPublishedPost } from '../services/notifications/notificationFanout.service.js';
import {
  attachAchievementsToResponse,
  dispatchAchievementEvents,
} from '../achievements/achievement.service.js';
import { estimateReadMinutesFromBlogFields } from '../modules/blog/readTimeEstimate.js';

async function respondReadCommit(
  res: Response,
  readerId: string,
  status: number,
  body: Record<string, unknown>
): Promise<void> {
  const shouldAward =
    body.counted === true && body.alreadyProcessed !== true && body.success !== false;
  if (!shouldAward) {
    res.status(status).json(body);
    return;
  }
  const newlyUnlocked = await dispatchAchievementEvents(readerId, [{ type: 'brief_read' }]);
  res.status(status).json(attachAchievementsToResponse(body, newlyUnlocked));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}

function normalizeBlogCounter(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  return 0;
}

const SLUG_MAX_LEN = 320;
const SUMMARY_MAX_LEN = 12000;

/** Active rows are not soft-deleted (`deletedAt` unset or null). */
const NOT_DELETED: { $or: Array<{ deletedAt: null } | { deletedAt: { $exists: boolean } }> } = {
  $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
};

function isEligibleForPublicRespect(doc: { status?: string; deletedAt?: Date | null }): boolean {
  return doc.status === 'published' && (doc.deletedAt == null || doc.deletedAt === undefined);
}

function optionalViewerId(req: Request): string | undefined {
  return (req as RequestWithOptionalAuth).authUser?._id;
}

function mapLastEditor(raw: unknown): { username: string; fullName: string } | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const u = raw as { username?: string; fullName?: string };
  const username = typeof u.username === 'string' ? u.username.trim() : '';
  if (!username) return undefined;
  const fullName =
    typeof u.fullName === 'string' && u.fullName.trim() ? u.fullName.trim() : username;
  return { username, fullName };
}

function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replaceAll(/\s+/g, '-')
      .replaceAll(/[^\w-]/g, '')
      .replaceAll(/-+/g, '-')
      .replaceAll(/^-+/g, '')
      .replaceAll(/-+$/g, '')
      .slice(0, 200) || 'post'
  );
}

/** Same author cannot reuse a slug; append a short suffix until unique (schema max 320). */
type TaxonomyFields = {
  category?: string;
  categories?: string[];
  tags?: string[];
  language?: string;
};

function mapTaxonomyFromDoc(p: TaxonomyFields): {
  category?: string;
  categories?: string[];
  tags?: string[];
  language?: string;
} {
  const categories = Array.isArray(p.categories) && p.categories.length ? p.categories : undefined;
  const category =
    typeof p.category === 'string' && p.category.trim()
      ? p.category.trim()
      : categories?.[0];
  const tags = Array.isArray(p.tags) && p.tags.length ? p.tags : undefined;
  const language =
    typeof p.language === 'string' && p.language.trim() ? p.language.trim().toLowerCase() : 'en';
  return { category, categories, tags, language };
}

function taxonomyWriteFields(tax: {
  category?: string;
  categories?: string[];
  tags?: string[];
  language?: string;
}) {
  return {
    category: tax.categories?.length ? tax.categories[0] : tax.category,
    categories: tax.categories?.length ? tax.categories : undefined,
    tags: tax.tags?.length ? tax.tags : undefined,
    language: tax.language ?? 'en',
  };
}

type FeedListItem = {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnailUrl?: string;
  updatedAt: Date;
  createdAt: Date;
  lastEditedAt?: string;
  lastEditedBy?: { username: string; fullName: string };
  respectCount: number;
  repostCount: number;
  bookmarkCount: number;
  commentCount: number;
  viewCount: number;
  readTimeMinutes: number;
  author: { username: string; fullName: string; profileImg: string };
  category?: string;
  tags?: string[];
  language?: string;
  viewerHasRespected?: boolean;
  viewerHasReposted?: boolean;
  viewerHasBookmarked?: boolean;
  squad?: {
    slug: string;
    name: string;
    iconUrl?: string;
    coverBannerUrl?: string;
    visibility: 'public' | 'private';
    memberCount?: number;
  };
};

function mapLeanSquadForFeed(squadRaw: unknown): NonNullable<FeedListItem['squad']> | undefined {
  if (!squadRaw || typeof squadRaw !== 'object' || Array.isArray(squadRaw)) return undefined;
  const s = squadRaw as {
    slug?: string;
    name?: string;
    iconUrl?: string;
    visibility?: string;
    coverBannerUrl?: string;
    memberCount?: number;
  };
  if (typeof s.slug !== 'string' || !s.slug.trim()) return undefined;
  const slug = s.slug.trim();
  return {
    slug,
    name: typeof s.name === 'string' && s.name.trim() ? s.name.trim() : slug,
    iconUrl: typeof s.iconUrl === 'string' && s.iconUrl.trim() ? s.iconUrl.trim() : undefined,
    coverBannerUrl:
      typeof s.coverBannerUrl === 'string' && s.coverBannerUrl.trim()
        ? s.coverBannerUrl.trim()
        : undefined,
    visibility: s.visibility === 'private' ? 'private' : 'public',
    memberCount:
      typeof s.memberCount === 'number' && Number.isFinite(s.memberCount)
        ? s.memberCount
        : undefined,
  };
}

function mapLeanPostToFeedListItem(p: unknown): FeedListItem | null {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const doc = p as Record<string, unknown>;
  const authorRaw = doc.authorId;
  if (!authorRaw || typeof authorRaw !== 'object' || Array.isArray(authorRaw)) {
    return null;
  }
  const a = authorRaw as { username?: string; fullName?: string; profileImg?: string };
  if (typeof a.username !== 'string' || !a.username.trim()) {
    return null;
  }
  const leAt = doc.lastEditedAt as Date | undefined;
  const leBy = mapLastEditor(doc.lastEditedById);
  const summary = typeof doc.summary === 'string' ? doc.summary : '';
  const content = typeof doc.content === 'string' ? doc.content : '';
  const squad = mapLeanSquadForFeed(doc.squadId);
  return {
    _id: String(doc._id),
    title: String(doc.title ?? ''),
    slug: String(doc.slug ?? ''),
    summary,
    thumbnailUrl: typeof doc.thumbnailUrl === 'string' ? doc.thumbnailUrl : undefined,
    updatedAt: doc.updatedAt as Date,
    createdAt: doc.createdAt as Date,
    lastEditedAt: leAt ? leAt.toISOString() : undefined,
    lastEditedBy: leBy,
    respectCount: normalizeRespectCount((doc as { respectCount?: number }).respectCount),
    repostCount: normalizeBlogCounter((doc as { repostCount?: number }).repostCount),
    bookmarkCount: normalizeBlogCounter((doc as { bookmarkCount?: number }).bookmarkCount),
    commentCount: normalizeBlogCounter((doc as { commentCount?: number }).commentCount),
    viewCount: normalizeBlogCounter((doc as { viewCount?: number }).viewCount),
    readTimeMinutes: estimateReadMinutesFromBlogFields(content, summary),
    author: {
      username: a.username.trim(),
      fullName:
        typeof a.fullName === 'string' && a.fullName.trim() ? a.fullName.trim() : a.username.trim(),
      profileImg: normalizeProfileImg(a.profileImg),
    },
    ...mapTaxonomyFromDoc(doc as TaxonomyFields),
    ...(squad ? { squad } : {}),
  };
}

function engagementCountsFromPostDoc(doc: Record<string, unknown>) {
  return {
    respectCount: normalizeRespectCount((doc as { respectCount?: number }).respectCount),
    repostCount: normalizeBlogCounter((doc as { repostCount?: number }).repostCount),
    bookmarkCount: normalizeBlogCounter((doc as { bookmarkCount?: number }).bookmarkCount),
    commentCount: normalizeBlogCounter((doc as { commentCount?: number }).commentCount),
  };
}

async function attachViewerEngagementToMyPosts<T extends { _id: unknown }>(
  req: Request,
  posts: T[]
): Promise<
  Array<
    T & { viewerHasRespected: boolean; viewerHasReposted: boolean; viewerHasBookmarked: boolean }
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
  items: FeedListItem[]
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

function slugWithCollisionSuffix(base: string, attempt: number): string {
  if (attempt <= 0) return base.slice(0, SLUG_MAX_LEN);
  const suf = `-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const room = SLUG_MAX_LEN - suf.length;
  return `${base.slice(0, Math.max(1, room))}${suf}`;
}

/** POST /api/blog - create a new blog post (draft or published) */
export async function createPost(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const { title, summary, content, thumbnailUrl, status } = req.body as {
      title?: string;
      summary?: string;
      content?: string;
      thumbnailUrl?: string;
      status?: 'draft' | 'published';
      category?: unknown;
      tags?: unknown;
      language?: unknown;
    };
    const tax = normalizeTaxonomyInput(
      req.body as { category?: unknown; categories?: unknown; tags?: unknown; language?: unknown }
    );
    const titleStr = typeof title === 'string' ? title.trim() : '';
    const contentStr = typeof content === 'string' ? content : '';
    if (!titleStr || titleStr.length > 300) {
      res
        .status(400)
        .json({ success: false, message: 'Title is required and must be at most 300 characters' });
      return;
    }
    const contentCheck = validateBlogPostContent(contentStr);
    if (!contentCheck.ok) {
      res.status(contentCheck.status).json({ success: false, message: contentCheck.message });
      return;
    }
    const baseSlug = slugify(titleStr);
    const finalStatus = status === 'published' ? 'published' : 'draft';
    const thumb = sanitizeThumbnailUrl(thumbnailUrl);
    const summaryStr = typeof summary === 'string' ? summary.trim().slice(0, SUMMARY_MAX_LEN) : '';

    const rawSquad = (req.body as { squadId?: unknown }).squadId;
    let squadOid: mongoose.Types.ObjectId | undefined;
    if (rawSquad != null && rawSquad !== '') {
      if (!mongoose.Types.ObjectId.isValid(String(rawSquad))) {
        res.status(400).json({ success: false, message: 'Invalid squadId' });
        return;
      }
      squadOid = new mongoose.Types.ObjectId(String(rawSquad));
      const gate = await assertCanPostOrShareToSquad({ squadId: squadOid, userId: user._id });
      if (!gate.ok) {
        res.status(gate.status).json({ success: false, message: gate.message });
        return;
      }
    }

    let post = null;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 12; attempt++) {
      const slug = slugWithCollisionSuffix(baseSlug, attempt);
      try {
        post = await BlogPostModel.create({
          authorId: user._id,
          title: titleStr,
          slug,
          summary: summaryStr || undefined,
          content: contentCheck.normalizedJson,
          thumbnailUrl: thumb,
          status: finalStatus,
          ...(finalStatus === 'published' ? { publishedAt: new Date() } : {}),
          ...taxonomyWriteFields(tax),
          ...(squadOid ? { squadId: squadOid } : {}),
        });
        break;
      } catch (err) {
        lastErr = err;
        const e = err as { code?: number };
        if (e.code === 11000) continue;
        throw err;
      }
    }
    if (!post) {
      const e = lastErr as { code?: number };
      if (e?.code === 11000) {
        res.status(409).json({
          success: false,
          message: 'Could not allocate a unique URL slug. Try a slightly different title.',
        });
        return;
      }
      throw lastErr;
    }

    const pSquad = (post as { squadId?: mongoose.Types.ObjectId }).squadId;
    if (finalStatus === 'published') {
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
      post: {
        _id: post._id,
        title: post.title,
        slug: post.slug,
        summary: post.summary,
        content: post.content,
        thumbnailUrl: post.thumbnailUrl,
        status: post.status,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        ...(pSquad ? { squadId: String(pSquad) } : {}),
        ...mapTaxonomyFromDoc(post as TaxonomyFields),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
}

/** PUT /api/blog/draft - upsert current user's draft (sync from local) */
export async function upsertDraft(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const { title, summary, content, thumbnailUrl } = req.body as {
      title?: string;
      summary?: string;
      content?: string;
      thumbnailUrl?: string;
    };
    const rawBody = req.body as Record<string, unknown>;
    const hasTaxonomyKeys =
      'category' in rawBody ||
      'categories' in rawBody ||
      'tags' in rawBody ||
      'language' in rawBody;
    const tax = hasTaxonomyKeys ? normalizeTaxonomyInput(rawBody) : null;
    let draftSquadId: mongoose.Types.ObjectId | null | undefined = undefined;
    if ('squadId' in rawBody) {
      const v = rawBody.squadId;
      if (v === null || v === '') draftSquadId = null;
      else if (typeof v === 'string' && mongoose.Types.ObjectId.isValid(v)) {
        draftSquadId = new mongoose.Types.ObjectId(v);
      } else {
        res.status(400).json({ success: false, message: 'Invalid squadId' });
        return;
      }
    }
    const titleStr = typeof title === 'string' ? title.trim() : '';
    const contentStr = typeof content === 'string' ? content : '';
    const summaryStr = typeof summary === 'string' ? summary.trim().slice(0, SUMMARY_MAX_LEN) : '';
    const contentCheck = validateBlogPostContent(contentStr);
    if (!contentCheck.ok) {
      res.status(contentCheck.status).json({ success: false, message: contentCheck.message });
      return;
    }
    const thumb = sanitizeThumbnailUrl(thumbnailUrl);
    const finalTitle = titleStr || 'Untitled draft';

    const post = await BlogPostModel.findOne({
      authorId: user._id,
      status: 'draft',
      ...NOT_DELETED,
    })
      .sort({ updatedAt: -1 })
      .limit(1)
      .lean();

    if (post) {
      const slug = slugify(finalTitle);
      const prevSq = (post as { squadId?: mongoose.Types.ObjectId | null }).squadId;
      const effectiveSq: mongoose.Types.ObjectId | null | undefined =
        draftSquadId !== undefined ? draftSquadId : (prevSq ?? null);
      if (effectiveSq) {
        const gate = await assertCanPostOrShareToSquad({
          squadId: effectiveSq as mongoose.Types.ObjectId,
          userId: user._id,
        });
        if (!gate.ok) {
          res.status(gate.status).json({ success: false, message: gate.message });
          return;
        }
      }
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
      const updated = await BlogPostModel.findByIdAndUpdate(post._id, patch, { new: true });
      if (!updated) {
        res.status(404).json({ success: false, message: 'Draft not found' });
        return;
      }
      const uSq = (updated as { squadId?: mongoose.Types.ObjectId | null }).squadId;
      res.status(200).json({
        success: true,
        post: {
          _id: updated._id,
          title: updated.title,
          slug: updated.slug,
          summary: updated.summary,
          content: updated.content,
          thumbnailUrl: updated.thumbnailUrl,
          status: updated.status,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          ...(uSq ? { squadId: String(uSq) } : {}),
          ...mapTaxonomyFromDoc(updated as TaxonomyFields),
        },
      });
      return;
    }

    if (draftSquadId) {
      const gate = await assertCanPostOrShareToSquad({
        squadId: draftSquadId,
        userId: user._id,
      });
      if (!gate.ok) {
        res.status(gate.status).json({ success: false, message: gate.message });
        return;
      }
    }

    const uniqueSlug = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const created = await BlogPostModel.create({
      authorId: user._id,
      title: finalTitle,
      slug: uniqueSlug,
      summary: summaryStr || undefined,
      content: contentCheck.normalizedJson,
      thumbnailUrl: thumb,
      status: 'draft',
      ...(draftSquadId ? { squadId: draftSquadId } : {}),
      ...(tax ? taxonomyWriteFields(tax) : { language: 'en' }),
    });

    const cSq = (created as { squadId?: mongoose.Types.ObjectId | null }).squadId;
    res.status(201).json({
      success: true,
      post: {
        _id: created._id,
        title: created.title,
        slug: created.slug,
        summary: created.summary,
        content: created.content,
        thumbnailUrl: created.thumbnailUrl,
        status: created.status,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        ...(cSq ? { squadId: String(cSq) } : {}),
        ...mapTaxonomyFromDoc(created as TaxonomyFields),
      },
    });
  } catch (err) {
    const e = err as { code?: number };
    if (e.code === 11000) {
      res
        .status(409)
        .json({ success: false, message: 'Draft slug conflict. Try a different title.' });
      return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to save draft' });
  }
}

/** GET /api/blog/draft - get current user's single draft (for sync/restore) */
export async function getDraft(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const draft = await BlogPostModel.findOne({
      authorId: user._id,
      status: 'draft',
      ...NOT_DELETED,
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
        summary: (draft as { summary?: string }).summary,
        content: draft.content,
        thumbnailUrl: (draft as { thumbnailUrl?: string }).thumbnailUrl,
        status: draft.status,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        ...mapTaxonomyFromDoc(draft as TaxonomyFields),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to get draft' });
  }
}

/** GET /api/blog/feed — public: recent published posts (home / explore). Optional `tag` or `category` filters. */
export async function listPublishedFeed(req: Request, res: Response): Promise<void> {
  try {
    const raw = Number.parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(raw) ? Math.min(50, Math.max(1, raw)) : 20;
    const tagRaw = typeof req.query.tag === 'string' ? req.query.tag.trim().toLowerCase() : '';
    const categoryRaw =
      typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';
    const sortRaw = typeof req.query.sort === 'string' ? req.query.sort.trim().toLowerCase() : '';
    const monthRaw = typeof req.query.month === 'string' ? req.query.month.trim() : '';
    const filter: Record<string, unknown> = { status: 'published', ...NOT_DELETED };
    if (tagRaw) filter.tags = tagRaw;
    if (categoryRaw) filter.category = categoryRaw;

    if (/^\d{4}-\d{2}$/.test(monthRaw)) {
      const [ys, ms] = monthRaw.split('-');
      const y = Number.parseInt(ys ?? '', 10);
      const mo = Number.parseInt(ms ?? '', 10);
      if (Number.isFinite(y) && mo >= 1 && mo <= 12) {
        const start = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(y, mo, 1, 0, 0, 0, 0));
        filter.$or = [
          { publishedAt: { $gte: start, $lt: end } },
          {
            $and: [
              {
                $or: [{ publishedAt: { $exists: false } }, { publishedAt: null }],
              },
              { createdAt: { $gte: start, $lt: end } },
            ],
          },
        ];
      }
    }

    const sort: Record<string, 1 | -1> =
      sortRaw === 'views' ? { viewCount: -1, updatedAt: -1 } : { updatedAt: -1 };

    const posts = await BlogPostModel.find(filter)
      .sort(sort)
      .limit(limit)
      .populate({ path: 'authorId', select: 'username fullName profileImg', model: 'users' })
      .populate({ path: 'lastEditedById', select: 'username fullName', model: 'users' })
      .populate({
        path: 'squadId',
        select: 'slug name iconUrl visibility coverBannerUrl memberCount',
        model: 'squads',
      })
      .lean();

    const items = posts.map(mapLeanPostToFeedListItem).filter((x): x is FeedListItem => x !== null);
    const postsOut = await applyViewerStateToFeedItems(req, items);

    res.status(200).json({ success: true, posts: postsOut });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load feed' });
  }
}

/** GET /api/blog/u/:username/posts — public: published posts by that author (profile / u-page grid). */
export async function listUserPublishedPosts(req: Request, res: Response): Promise<void> {
  try {
    const usernameParam = paramString(req.params.username);
    if (!usernameParam?.trim()) {
      res.status(400).json({ success: false, message: 'Invalid username' });
      return;
    }
    const raw = Number.parseInt(String(req.query.limit ?? ''), 10);
    const limit = Number.isFinite(raw) ? Math.min(50, Math.max(1, raw)) : 24;
    const user = await UserModel.findOne({
      username: new RegExp(`^${escapeRegex(usernameParam.trim())}$`, 'i'),
    })
      .select('_id')
      .lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const posts = await BlogPostModel.find({
      authorId: user._id,
      status: 'published',
      ...NOT_DELETED,
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate({ path: 'authorId', select: 'username fullName profileImg', model: 'users' })
      .populate({ path: 'lastEditedById', select: 'username fullName', model: 'users' })
      .populate({
        path: 'squadId',
        select: 'slug name iconUrl visibility coverBannerUrl memberCount',
        model: 'squads',
      })
      .lean();

    const items = posts.map(mapLeanPostToFeedListItem).filter((x): x is FeedListItem => x !== null);
    const postsOut = await applyViewerStateToFeedItems(req, items);

    res.status(200).json({ success: true, posts: postsOut });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load posts' });
  }
}

/** GET /api/blog/p/:username/:slug — public: one published post by author username + slug. */
export async function getPublishedPostBySlug(req: Request, res: Response): Promise<void> {
  try {
    const usernameParam = paramString(req.params.username);
    const slugRaw = paramString(req.params.slug);
    const slug = slugRaw?.trim() ?? '';
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
    const viewerId = optionalViewerId(req);
    let post = await BlogPostModel.findOne({
      authorId: user._id,
      slug,
      status: 'published',
      ...NOT_DELETED,
    })
      .populate({ path: 'authorId', select: 'username fullName profileImg', model: 'users' })
      .populate({ path: 'lastEditedById', select: 'username fullName', model: 'users' })
      .populate({
        path: 'squadId',
        select: 'slug name iconUrl visibility coverBannerUrl memberCount',
        model: 'squads',
      })
      .lean();

    if (!post && viewerId && viewerId === String(user._id)) {
      post = await BlogPostModel.findOne({
        authorId: user._id,
        slug,
        status: 'suspended',
        ...NOT_DELETED,
      })
        .populate({ path: 'authorId', select: 'username fullName profileImg', model: 'users' })
        .populate({ path: 'lastEditedById', select: 'username fullName', model: 'users' })
        .populate({
          path: 'squadId',
          select: 'slug name iconUrl visibility coverBannerUrl memberCount',
          model: 'squads',
        })
        .lean();
    }

    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    const aRaw = post.authorId as unknown;
    if (!aRaw || typeof aRaw !== 'object' || Array.isArray(aRaw)) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    const a = aRaw as { username: string; fullName?: string; profileImg?: string };
    const leAt = (post as { lastEditedAt?: Date }).lastEditedAt;
    const leBy = mapLastEditor((post as { lastEditedById?: unknown }).lastEditedById);
    const squadDetail = mapLeanSquadForFeed((post as { squadId?: unknown }).squadId);
    const postIdStr = String(post._id);
    const respectCount = normalizeRespectCount((post as { respectCount?: number }).respectCount);
    const repostCount = normalizeBlogCounter((post as { repostCount?: number }).repostCount);
    const bookmarkCount = normalizeBlogCounter((post as { bookmarkCount?: number }).bookmarkCount);
    const commentCount = normalizeBlogCounter((post as { commentCount?: number }).commentCount);
    const viewCount = normalizeBlogCounter((post as { viewCount?: number }).viewCount);
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
        summary: (post as { summary?: string }).summary ?? '',
        content: post.content,
        thumbnailUrl: (post as { thumbnailUrl?: string }).thumbnailUrl,
        status: post.status,
        moderationSuspended: post.status === 'suspended',
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
    res.status(500).json({ success: false, message: 'Failed to load post' });
  }
}

/** POST /api/blog/p/:username/:slug/read-day — logged-in reader; counts toward public reading streak (UTC day). */
export async function recordBlogReadDay(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as Request & { user?: AuthUser }).user;
    if (!authUser?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const usernameParam = paramString(req.params.username);
    const slug = paramString(req.params.slug);
    if (!usernameParam || !slug) {
      res.status(400).json({ success: false, message: 'Invalid path' });
      return;
    }
    const author = await UserModel.findOne({
      username: new RegExp(`^${escapeRegex(usernameParam)}$`, 'i'),
    })
      .select('_id')
      .lean();
    if (!author) {
      res.status(404).json({ success: false, message: 'Author not found' });
      return;
    }
    const readerId = new mongoose.Types.ObjectId(authUser._id);
    const authorId = author._id as mongoose.Types.ObjectId;
    if (readerId.equals(authorId)) {
      res.status(200).json({ success: true, counted: false, reason: 'self' });
      return;
    }
    const post = await BlogPostModel.findOne({
      authorId,
      slug,
      status: 'published',
      ...NOT_DELETED,
    })
      .select('_id')
      .lean();
    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    const now = new Date();
    const dayBucket = streakUtcDayBucket(now);
    await BlogReadDayModel.updateOne(
      { readerId, dayBucket },
      { $set: { updatedAt: now } },
      { upsert: true }
    );
    void bumpReadStreakLongestFromMongo(readerId, now).catch((e) =>
      console.error('[read-streak] bump longest', e)
    );
    const redis = getRedis();
    if (redis) {
      void syncReadStreakRedisAfterMongoUpsert({ redis, readerId, dayBucket, now }).catch((e) =>
        console.error('[read-streak] redis sync failed', e)
      );
    }
    res.status(200).json({ success: true, counted: true, dayBucket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to record read' });
  }
}

/** POST /api/blog/p/:username/:slug/read/start — VIEW_START (BLOG_READ_STREAK.md §16); requires Redis. */
export async function startBlogReadView(req: Request, res: Response): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) {
      res.status(503).json({
        success: false,
        code: 'READ_STREAK_REDIS_UNAVAILABLE',
        message: 'Read view session requires Redis',
      });
      return;
    }
    const authUser = (req as Request & { user?: AuthUser }).user;
    if (!authUser?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const usernameParam = paramString(req.params.username);
    const slug = paramString(req.params.slug);
    if (!usernameParam || !slug) {
      res.status(400).json({ success: false, message: 'Invalid path' });
      return;
    }
    const author = await UserModel.findOne({
      username: new RegExp(`^${escapeRegex(usernameParam)}$`, 'i'),
    })
      .select('_id')
      .lean();
    if (!author) {
      res.status(404).json({ success: false, message: 'Author not found' });
      return;
    }
    const readerId = new mongoose.Types.ObjectId(authUser._id);
    const authorId = author._id as mongoose.Types.ObjectId;
    if (readerId.equals(authorId)) {
      res
        .status(200)
        .json({
          success: true,
          sessionId: null,
          reason: 'self',
          minDwellMs: MIN_READ_COMMIT_DWELL_MS,
        });
      return;
    }
    const post = await BlogPostModel.findOne({
      authorId,
      slug,
      status: 'published',
      ...NOT_DELETED,
    })
      .select('_id')
      .lean();
    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    const underLimit = await consumeReadViewStartRateLimit(redis, String(readerId));
    if (!underLimit) {
      incrementReadStreakMetric('readViewStartRateLimited');
      res.status(429).json({
        success: false,
        code: 'READ_VIEW_START_RATE_LIMIT',
        message: 'Too many read sessions; try again in a minute',
      });
      return;
    }
    const sessionId = randomUUID();
    const key = redisKeys.readStreak.viewSession(sessionId);
    await redis.hSet(key, {
      userId: String(readerId),
      postId: String(post._id),
      startTime: String(Date.now()),
      used: '0',
    });
    await redis.expire(key, READ_VIEW_SESSION_TTL_SEC);
    res.status(200).json({ success: true, sessionId, minDwellMs: MIN_READ_COMMIT_DWELL_MS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to start read view' });
  }
}

/** POST /api/blog/p/:username/:slug/read/commit — VIEW_COMMIT + F.1 Lua; Mongo upsert before EVAL. */
export async function commitBlogReadView(req: Request, res: Response): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) {
      res.status(503).json({
        success: false,
        code: 'READ_STREAK_REDIS_UNAVAILABLE',
        message: 'Read view commit requires Redis',
      });
      return;
    }
    const authUser = (req as Request & { user?: AuthUser }).user;
    if (!authUser?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const usernameParam = paramString(req.params.username);
    const slug = paramString(req.params.slug);
    const sessionId =
      typeof (req.body as { sessionId?: unknown })?.sessionId === 'string'
        ? String((req.body as { sessionId: string }).sessionId).trim()
        : '';
    if (!usernameParam || !slug || !sessionId) {
      res.status(400).json({ success: false, message: 'Invalid path or sessionId' });
      return;
    }
    const author = await UserModel.findOne({
      username: new RegExp(`^${escapeRegex(usernameParam)}$`, 'i'),
    })
      .select('_id')
      .lean();
    if (!author) {
      res.status(404).json({ success: false, message: 'Author not found' });
      return;
    }
    const readerId = new mongoose.Types.ObjectId(authUser._id);
    const authorId = author._id as mongoose.Types.ObjectId;
    if (readerId.equals(authorId)) {
      res.status(200).json({ success: true, counted: false, reason: 'self' });
      return;
    }

    const sk = redisKeys.readStreak.viewSession(sessionId);
    const ackKey = redisKeys.readStreak.viewCommitAck(String(readerId), sessionId);

    const [su, sp, startTimeRaw] = await Promise.all([
      redis.hGet(sk, 'userId'),
      redis.hGet(sk, 'postId'),
      redis.hGet(sk, 'startTime'),
    ]);

    if (!su || !sp) {
      const ackHit = await redis.get(ackKey);
      const now = new Date();
      const dayBucket = streakUtcDayBucket(now);
      if (ackHit) {
        res.status(200).json({ success: true, counted: true, alreadyProcessed: true, dayBucket });
        return;
      }
      const mongoHit = await BlogReadDayModel.exists({ readerId, dayBucket });
      if (mongoHit) {
        res.status(200).json({ success: true, counted: true, alreadyProcessed: true, dayBucket });
        return;
      }
      res.status(400).json({ success: false, reason: 'invalid_session' });
      return;
    }

    if (su !== String(readerId)) {
      res.status(403).json({ success: false, message: 'Session mismatch' });
      return;
    }

    const startMs = Number.parseInt(startTimeRaw ?? '', 10);
    const elapsed = Date.now() - startMs;
    if (!Number.isFinite(elapsed) || elapsed < MIN_READ_COMMIT_DWELL_MS) {
      res.status(400).json({
        success: false,
        reason: 'dwell_too_short',
        minDwellMs: MIN_READ_COMMIT_DWELL_MS,
      });
      return;
    }

    const postOk = await BlogPostModel.findOne({
      _id: new mongoose.Types.ObjectId(sp),
      authorId,
      slug,
      status: 'published',
      ...NOT_DELETED,
    })
      .select('_id')
      .lean();
    if (!postOk) {
      res.status(400).json({ success: false, reason: 'invalid_post' });
      return;
    }

    const now = new Date();
    const today = streakUtcDayBucket(now);
    const yesterday = previousUtcCalendarDay(today);
    assertTodayIsNextUtcDayAfterYesterday(today, yesterday);

    const streakKey = redisKeys.readStreak.dailyHash(String(readerId));
    const lastDayRedis = await redis.hGet(streakKey, 'lastDay');
    if (lastDayRedis && today < lastDayRedis) {
      console.error('[read-streak] STREAK_MONOTONICITY_BROKEN', {
        readerId: String(readerId),
        today,
        lastDayRedis,
      });
      res.status(500).json({ success: false, code: 'STREAK_MONOTONICITY_BROKEN' });
      return;
    }

    await BlogReadDayModel.updateOne(
      { readerId, dayBucket: today },
      { $set: { updatedAt: now } },
      { upsert: true }
    );
    await bumpReadStreakLongestFromMongo(readerId, now).catch((e) =>
      console.error('[read-streak] bump longest', e)
    );

    const zKey = redisKeys.readStreak.readDaysZset(String(readerId));
    let out;
    try {
      out = await evalReadViewCommitMerged(redis, [sk, streakKey, zKey, ackKey], {
        today,
        yesterday,
        zsetScoreMs: readDayZsetScoreMs(today),
        trimMinScoreStr: String(readDaysTrimMinRetainMsUtc(now)),
        lastUpdatedMs: String(now.getTime()),
        userId: String(readerId),
        postId: sp,
        ackTtlSeconds: READ_VIEW_ACK_TTL_SEC,
      });
    } catch (e) {
      console.error('[read-streak] merged lua failed after mongo upsert', e);
      incrementReadStreakMetric('readViewCommitRedisFail');
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
        .json({ success: true, counted: true, alreadyProcessed: true, dayBucket: today });
      return;
    }
    if (out.status === 1 || out.status === 0) {
      const postOid = new mongoose.Types.ObjectId(sp);
      await BlogPostModel.updateOne({ _id: postOid }, { $inc: { viewCount: 1 } });
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
      res.status(409).json({ success: false, code: 'STREAK_DAY_NON_MONOTONIC' });
      return;
    }
    if (out.status === -1) {
      const mongoHit = await BlogReadDayModel.exists({ readerId, dayBucket: today });
      if (mongoHit) {
        res
          .status(200)
          .json({ success: true, counted: true, alreadyProcessed: true, dayBucket: today });
        return;
      }
      res.status(400).json({ success: false, reason: 'invalid_session' });
      return;
    }

    res.status(500).json({ success: false, message: 'Unexpected commit status' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to commit read view' });
  }
}

const SOFT_DELETE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** GET /api/blog - list current user's posts (for now: my posts only) */
export async function listMyPosts(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const status = (req.query.status as string) || undefined;
    const cutoff = new Date(Date.now() - SOFT_DELETE_RETENTION_MS);

    if (status === 'deleted') {
      const posts = await BlogPostModel.find({
        authorId: user._id,
        deletedAt: { $exists: true, $ne: null, $gte: cutoff },
      })
        .select(
          'title slug summary content thumbnailUrl status createdAt updatedAt deletedAt lastEditedAt category tags language respectCount repostCount bookmarkCount commentCount'
        )
        .populate({ path: 'lastEditedById', select: 'username fullName', model: 'users' })
        .sort({ deletedAt: -1 })
        .limit(50)
        .lean();

      const deletedMapped = posts.map((p) => {
        const leAt = (p as { lastEditedAt?: Date }).lastEditedAt;
        const leBy = mapLastEditor((p as { lastEditedById?: unknown }).lastEditedById);
        const delAt = (p as { deletedAt?: Date }).deletedAt;
        const doc = p as Record<string, unknown>;
        return {
          _id: p._id,
          title: p.title,
          slug: p.slug,
          summary: (p as { summary?: string }).summary,
          content: p.content,
          thumbnailUrl: (p as { thumbnailUrl?: string }).thumbnailUrl,
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

    const filter: Record<string, unknown> = { authorId: user._id, ...NOT_DELETED };
    if (status === 'draft' || status === 'published' || status === 'suspended') {
      filter.status = status;
    }

    const posts = await BlogPostModel.find(filter)
      .select(
        'title slug summary content thumbnailUrl status createdAt updatedAt lastEditedAt category tags language respectCount repostCount bookmarkCount commentCount squadId'
      )
      .populate({ path: 'lastEditedById', select: 'username fullName', model: 'users' })
      .populate({
        path: 'squadId',
        select: 'slug name iconUrl visibility coverBannerUrl memberCount',
        model: 'squads',
      })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    const mapped = posts.map((p) => {
      const leAt = (p as { lastEditedAt?: Date }).lastEditedAt;
      const leBy = mapLastEditor((p as { lastEditedById?: unknown }).lastEditedById);
      const summary = (p as { summary?: string }).summary ?? '';
      const content = (p as { content?: string }).content;
      const doc = p as Record<string, unknown>;
      const squad = mapLeanSquadForFeed(doc.squadId);
      return {
        _id: p._id,
        title: p.title,
        slug: p.slug,
        summary,
        content,
        thumbnailUrl: (p as { thumbnailUrl?: string }).thumbnailUrl,
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
      status === 'published' ? await attachViewerEngagementToMyPosts(req, mapped) : mapped;

    res.status(200).json({
      success: true,
      posts: postsOut,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to list posts' });
  }
}

/** GET /api/blog/post/:postId — owner-only: load one post for editing. */
export async function getMyPostById(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const postId = paramString(req.params.postId);
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      res.status(400).json({ success: false, message: 'Invalid post id' });
      return;
    }
    const post = await BlogPostModel.findOne({
      _id: postId,
      authorId: user._id,
      ...NOT_DELETED,
    }).lean();
    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    res.status(200).json({
      success: true,
      post: {
        _id: String(post._id),
        title: post.title,
        slug: post.slug,
        summary: (post as { summary?: string }).summary ?? '',
        content: post.content,
        thumbnailUrl: (post as { thumbnailUrl?: string }).thumbnailUrl,
        status: post.status,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        ...((post as { squadId?: mongoose.Types.ObjectId }).squadId
          ? { squadId: String((post as { squadId?: mongoose.Types.ObjectId }).squadId) }
          : {}),
        ...mapTaxonomyFromDoc(post as TaxonomyFields),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load post' });
  }
}

/** PUT /api/blog/post/:postId — owner-only: update draft or published post. */
export async function updateMyPost(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const postId = paramString(req.params.postId);
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      res.status(400).json({ success: false, message: 'Invalid post id' });
      return;
    }
    const existing = await BlogPostModel.findOne({ _id: postId, authorId: user._id });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    const wasEligibleRespect = isEligibleForPublicRespect(existing);
    const wasPublishedBefore = existing.status === 'published';
    const rawBody = req.body as Record<string, unknown>;
    const hasTaxonomyKeys =
      'category' in rawBody ||
      'categories' in rawBody ||
      'tags' in rawBody ||
      'language' in rawBody;
    const tax = hasTaxonomyKeys ? normalizeTaxonomyInput(rawBody) : null;
    const { title, summary, content, thumbnailUrl, status, silent } = req.body as {
      title?: string;
      summary?: string;
      content?: string;
      thumbnailUrl?: string;
      status?: 'draft' | 'published';
      /** Autosave / background sync: do not bump public “edited by” audit fields. */
      silent?: boolean;
    };

    const titleStr =
      typeof title === 'string' && title.trim() ? title.trim().slice(0, 300) : existing.title;
    const contentStr = typeof content === 'string' ? content : existing.content;
    const contentCheck = validateBlogPostContent(contentStr);
    if (!contentCheck.ok) {
      res.status(contentCheck.status).json({ success: false, message: contentCheck.message });
      return;
    }
    const summaryStr =
      typeof summary === 'string'
        ? summary.trim().slice(0, SUMMARY_MAX_LEN)
        : (existing.summary ?? '') || '';

    /**
     * Explicit "Save draft" while editing a **published** post: create a new draft with the
     * editor payload. The published document is not modified (live URL unchanged).
     */
    if (status === 'draft' && existing.status === 'published' && silent !== true) {
      const thumb =
        thumbnailUrl !== undefined ? sanitizeThumbnailUrl(thumbnailUrl) : existing.thumbnailUrl;
      const exDoc = existing as IBlogPost;
      const forkCategory = hasTaxonomyKeys ? tax?.category : exDoc.category;
      const forkTags = hasTaxonomyKeys ? (tax?.tags?.length ? tax.tags : undefined) : exDoc.tags;
      const forkLang = hasTaxonomyKeys
        ? (tax?.language ?? exDoc.language ?? 'en')
        : (exDoc.language ?? 'en');
      const baseSlug = slugify(titleStr);
      let newPost: IBlogPost | null = null;
      let lastErr: unknown;
      for (let attempt = 0; attempt < 12; attempt++) {
        const cand = slugWithCollisionSuffix(baseSlug, attempt);
        try {
          newPost = (await BlogPostModel.create({
            authorId: user._id as unknown as mongoose.Types.ObjectId,
            title: titleStr,
            slug: cand,
            summary: summaryStr || undefined,
            content: contentCheck.normalizedJson,
            thumbnailUrl: thumb ?? undefined,
            status: 'draft',
            ...(forkCategory ? { category: forkCategory } : {}),
            ...(forkTags?.length ? { tags: forkTags } : {}),
            language: forkLang,
          })) as IBlogPost;
          break;
        } catch (err) {
          lastErr = err;
          const e = err as { code?: number };
          if (e.code === 11000) continue;
          throw err;
        }
      }
      if (!newPost) {
        const e = lastErr as { code?: number };
        if (e?.code === 11000) {
          res.status(409).json({
            success: false,
            message: 'Could not allocate a unique URL slug. Try a slightly different title.',
          });
          return;
        }
        throw lastErr;
      }
      res.status(201).json({
        success: true,
        forkedFromPublished: true,
        post: {
          _id: newPost._id,
          title: newPost.title,
          slug: newPost.slug,
          summary: newPost.summary,
          content: newPost.content,
          thumbnailUrl: newPost.thumbnailUrl,
          status: newPost.status,
          createdAt: newPost.createdAt,
          updatedAt: newPost.updatedAt,
          ...mapTaxonomyFromDoc(newPost),
        },
      });
      return;
    }

    if ('squadId' in rawBody) {
      const v = rawBody.squadId;
      if (v === null || v === '') {
        existing.set('squadId', null);
      } else if (typeof v === 'string' && mongoose.Types.ObjectId.isValid(v)) {
        existing.set('squadId', new mongoose.Types.ObjectId(v));
      } else {
        res.status(400).json({ success: false, message: 'Invalid squadId' });
        return;
      }
    }

    let nextSlug = existing.slug;
    if (typeof title === 'string' && title.trim() && titleStr !== existing.title) {
      const base = slugify(titleStr);
      for (let attempt = 0; attempt < 12; attempt++) {
        const cand = slugWithCollisionSuffix(base, attempt);
        const clash = await BlogPostModel.findOne({
          authorId: user._id,
          slug: cand,
          _id: { $ne: existing._id },
        })
          .select('_id')
          .lean();
        if (!clash) {
          nextSlug = cand;
          break;
        }
      }
    }

    existing.title = titleStr;
    existing.slug = nextSlug;
    existing.summary = summaryStr || undefined;
    existing.content = contentCheck.normalizedJson;
    if (thumbnailUrl !== undefined) {
      existing.thumbnailUrl = sanitizeThumbnailUrl(thumbnailUrl) ?? undefined;
    }
    if (status === 'draft' || status === 'published') {
      existing.status = status;
      if (status === 'published') {
        existing.suspendedAt = undefined;
        existing.suspendedById = undefined;
      }
    }
    if (tax) {
      const fields = taxonomyWriteFields(tax);
      existing.category = fields.category;
      existing.categories = fields.categories;
      existing.tags = fields.tags;
      existing.language = fields.language ?? 'en';
    }
    if (!wasPublishedBefore && existing.status === 'published') {
      const ex = existing as IBlogPost;
      if (!(ex.publishedAt instanceof Date) || Number.isNaN(ex.publishedAt.getTime())) {
        ex.publishedAt = new Date();
      }
    }
    // Only record "edited" when the post was already published before this save (not first publish).
    if (silent !== true && wasPublishedBefore) {
      existing.lastEditedById = user._id as unknown as mongoose.Types.ObjectId;
      existing.lastEditedAt = new Date();
    }
    const exSquad = (existing as { squadId?: mongoose.Types.ObjectId | null }).squadId;
    if (exSquad) {
      const gate = await assertCanPostOrShareToSquad({
        squadId: exSquad as mongoose.Types.ObjectId,
        userId: user._id,
      });
      if (!gate.ok) {
        res.status(gate.status).json({ success: false, message: gate.message });
        return;
      }
    }

    const willBeEligibleRespect = isEligibleForPublicRespect(existing);
    await existing.save();
    if (wasEligibleRespect && !willBeEligibleRespect) {
      await Promise.all([
        suspendRespectContributionsForPost(
          existing._id as mongoose.Types.ObjectId,
          existing.authorId as mongoose.Types.ObjectId
        ),
        suspendRepostBookmarkContributionsForPost(existing._id as mongoose.Types.ObjectId),
      ]);
    }
    if (!wasEligibleRespect && willBeEligibleRespect) {
      await Promise.all([
        resumeRespectContributionsForPost(
          existing._id as mongoose.Types.ObjectId,
          existing.authorId as mongoose.Types.ObjectId
        ),
        resumeRepostBookmarkContributionsForPost(existing._id as mongoose.Types.ObjectId),
      ]);
    }

    const outSquad = (existing as { squadId?: mongoose.Types.ObjectId | null }).squadId;
    const firstPublish = !wasPublishedBefore && existing.status === 'published';
    const postBody = {
      success: true,
      post: {
        _id: existing._id,
        title: existing.title,
        slug: existing.slug,
        summary: existing.summary,
        content: existing.content,
        thumbnailUrl: existing.thumbnailUrl,
        status: existing.status,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
        ...(outSquad ? { squadId: String(outSquad) } : {}),
        ...mapTaxonomyFromDoc(existing as TaxonomyFields),
      },
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
        { type: 'profile_sync' },
      ]);
      res.status(200).json(attachAchievementsToResponse(postBody, newlyUnlocked));
    } else {
      res.status(200).json(postBody);
    }
  } catch (err) {
    const e = err as { code?: number };
    if (e.code === 11000) {
      res.status(409).json({ success: false, message: 'Slug conflict' });
      return;
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update post' });
  }
}

/** PUT /api/blog/post/:postId/restore — owner-only: undelete within retention window; becomes published. */
export async function restoreMyPost(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const postId = paramString(req.params.postId);
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      res.status(400).json({ success: false, message: 'Invalid post id' });
      return;
    }
    const doc = await BlogPostModel.findOne({
      _id: postId,
      authorId: user._id,
      deletedAt: { $exists: true, $ne: null },
    });
    if (!doc) {
      res.status(404).json({ success: false, message: 'Post not found or not in trash' });
      return;
    }
    const del = doc.deletedAt;
    if (!del || del.getTime() < Date.now() - SOFT_DELETE_RETENTION_MS) {
      res
        .status(410)
        .json({
          success: false,
          message: 'This post is no longer in the recoverable trash window',
        });
      return;
    }

    let nextSlug = doc.slug;
    const clash = await BlogPostModel.findOne({
      authorId: user._id,
      slug: doc.slug,
      ...NOT_DELETED,
      _id: { $ne: doc._id },
    })
      .select('_id')
      .lean();
    if (clash) {
      const base = slugify(doc.title);
      for (let attempt = 0; attempt < 12; attempt++) {
        const cand = slugWithCollisionSuffix(base, attempt);
        const c2 = await BlogPostModel.findOne({ authorId: user._id, slug: cand, ...NOT_DELETED })
          .select('_id')
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
    doc.status = 'published';
    const restored = doc as IBlogPost;
    if (!(restored.publishedAt instanceof Date) || Number.isNaN(restored.publishedAt.getTime())) {
      restored.publishedAt = new Date();
    }
    await doc.save();
    await Promise.all([
      resumeRespectContributionsForPost(
        doc._id as mongoose.Types.ObjectId,
        doc.authorId as mongoose.Types.ObjectId
      ),
      resumeRepostBookmarkContributionsForPost(doc._id as mongoose.Types.ObjectId),
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
    res.status(500).json({ success: false, message: 'Failed to restore post' });
  }
}

/** DELETE /api/blog/post/:postId/permanent — owner-only: hard-delete a soft-deleted post. */
export async function purgeMyPostPermanently(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const postId = paramString(req.params.postId);
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      res.status(400).json({ success: false, message: 'Invalid post id' });
      return;
    }
    const removed = await BlogPostModel.findOneAndDelete({
      _id: postId,
      authorId: user._id,
      deletedAt: { $exists: true, $ne: null },
    });
    if (!removed) {
      res.status(404).json({ success: false, message: 'Post not found or not in trash' });
      return;
    }
    const pid = removed._id as mongoose.Types.ObjectId;
    await deleteAllRespectsForPost(pid);
    await Promise.all([deleteAllRepostsForPost(pid), deleteAllBookmarksForPost(pid)]);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to permanently delete post' });
  }
}

/** DELETE /api/blog/post/:postId — owner-only. */
export async function deleteMyPost(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const postId = paramString(req.params.postId);
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      res.status(400).json({ success: false, message: 'Invalid post id' });
      return;
    }
    const updated = await BlogPostModel.findOneAndUpdate(
      { _id: postId, authorId: user._id, ...NOT_DELETED },
      {
        deletedAt: new Date(),
        deletedById: user._id as unknown as mongoose.Types.ObjectId,
      },
      { new: true }
    );
    if (!updated) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }
    await Promise.all([
      suspendRespectContributionsForPost(
        updated._id as mongoose.Types.ObjectId,
        updated.authorId as mongoose.Types.ObjectId
      ),
      suspendRepostBookmarkContributionsForPost(updated._id as mongoose.Types.ObjectId),
    ]);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
}

/** GET /api/blog/taxonomy — public: curated categories/tags plus published post counts. */
export async function getBlogTaxonomy(_req: Request, res: Response): Promise<void> {
  try {
    const { listTaxonomyCategoriesPaginated, listTaxonomyTagsPaginated } = await import(
      '../services/blogTaxonomy.service.js'
    );
    const [categoriesPage, tagsPage] = await Promise.all([
      listTaxonomyCategoriesPaginated({ offset: 0, limit: 10_000, sort: 'posts-desc' }),
      listTaxonomyTagsPaginated({ offset: 0, limit: 80, sort: 'posts-desc' }),
    ]);
    const categories = categoriesPage.list;
    const tags = tagsPage.list.map((t) => ({
      slug: t.slug,
      name: t.name,
      description: '',
      postCount: t.postCount,
    }));
    res.status(200).json({ success: true, categories, tags });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load taxonomy' });
  }
}

/** GET /api/blog/taxonomy/categories — public paginated category list for Topics page. */
export async function listBlogTaxonomyCategories(req: Request, res: Response): Promise<void> {
  try {
    const { listTaxonomyCategoriesPaginated } = await import(
      '../services/blogTaxonomy.service.js'
    );
    const page = await listTaxonomyCategoriesPaginated({
      offset: req.query.offset,
      limit: req.query.limit,
      sort: req.query.sort,
      q: req.query.q,
    });
    res.status(200).json({ success: true, ...page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load categories' });
  }
}

/** GET /api/blog/tags/list — public paginated tag list for Topics page. */
export async function listBlogTagsPaginated(req: Request, res: Response): Promise<void> {
  try {
    const { listTaxonomyTagsPaginated } = await import('../services/blogTaxonomy.service.js');
    const page = await listTaxonomyTagsPaginated({
      offset: req.query.offset,
      limit: req.query.limit,
      sort: req.query.sort,
      q: req.query.q,
    });
    res.status(200).json({ success: true, ...page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load tags' });
  }
}

/** GET /api/blog/tags/explore — public: trending / popular / recently active tag rankings. */
export async function getBlogTagsExplore(_req: Request, res: Response): Promise<void> {
  try {
    const { loadExploreTagRankings, mapExploreTagRows } = await import(
      '../services/blogTaxonomy.service.js'
    );
    const { nameBySlug, trendingAgg, popularAgg, recentAgg } = await loadExploreTagRankings();
    res.status(200).json({
      success: true,
      trending: mapExploreTagRows(trendingAgg, nameBySlug),
      popular: mapExploreTagRows(popularAgg, nameBySlug),
      recent: mapExploreTagRows(recentAgg, nameBySlug, true),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load tags' });
  }
}

/** Build feed-shaped items for populated post docs (bookmarks library, etc.). */
export async function buildFeedListItemsForPosts(req: Request, postDocs: unknown[]) {
  const items = postDocs
    .map(mapLeanPostToFeedListItem)
    .filter((x): x is FeedListItem => x !== null);
  return applyViewerStateToFeedItems(req, items);
}
