import { blogAuthFetch, blogPublicFetch } from "@/lib/api/blogAuthFetch";
import { resolvePublicApiBase } from "@/lib/api/publicApiBase";
import type {
  BlogPostResponse,
  CreatePostPayload,
  GetDraftResponse,
} from "@contracts/blogApi";
import type {
  BlogTaxonomyRow,
  PublicBlogComment,
  PublicBlogPostDetail,
  PublicFeedPost,
} from "@/types/blog";
const getApiBase = () => resolvePublicApiBase();
async function readJson<T>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}
export function pickRemoteThumbnailForApi(
  preview: string | null | undefined,
): string | undefined {
  if (preview == null || typeof preview !== "string") return undefined;
  const t = preview.trim();
  if (!t.startsWith("http://") && !t.startsWith("https://")) return undefined;
  return t.slice(0, 2000);
}
export type {
  CreatePostPayload,
  BlogPostResponse,
  GetDraftResponse,
} from "@contracts/blogApi";
export const blogApi = {
  getTaxonomy: async (): Promise<{
    success: boolean;
    categories: BlogTaxonomyRow[];
    tags: BlogTaxonomyRow[];
  }> => {
    const r = await blogPublicFetch(`${getApiBase()}/api/blog/taxonomy`);
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      categories?: BlogTaxonomyRow[];
      tags?: BlogTaxonomyRow[];
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: true,
      categories: data.categories ?? [],
      tags: data.tags ?? [],
    };
  },
  getPublishedFeed: async (
    limit = 24,
    opts?: {
      tag?: string;
      category?: string;
      sort?: "recent" | "views";
      month?: string;
      offset?: number;
    },
    accessToken?: string | null,
  ): Promise<{
    success: boolean;
    posts: PublicFeedPost[];
    hasMore: boolean;
  }> => {
    const sp = new URLSearchParams();
    sp.set("limit", String(limit));
    if (opts?.offset != null && opts.offset > 0)
      sp.set("offset", String(opts.offset));
    if (opts?.tag?.trim()) sp.set("tag", opts.tag.trim().toLowerCase());
    if (opts?.category?.trim())
      sp.set("category", opts.category.trim().toLowerCase());
    if (opts?.sort === "views") sp.set("sort", "views");
    if (opts?.month?.trim()) sp.set("month", opts.month.trim());
    const q = sp.toString();
    const url = `${getApiBase()}/api/blog/feed?${q}`;
    const r =
      accessToken != null && accessToken !== ""
        ? await blogAuthFetch(url, { method: "GET" }, accessToken)
        : await blogPublicFetch(url);
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      posts?: PublicFeedPost[];
      hasMore?: boolean;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: true,
      posts: data.posts ?? [],
      hasMore: data.hasMore ?? false,
    };
  },
  getUserPublishedPosts: async (
    username: string,
    limit = 24,
    accessToken?: string | null,
  ): Promise<{
    success: boolean;
    posts: PublicFeedPost[];
  }> => {
    const u = encodeURIComponent(username);
    const url = `${getApiBase()}/api/blog/u/${u}/posts?limit=${encodeURIComponent(String(limit))}`;
    const r =
      accessToken != null && accessToken !== ""
        ? await blogAuthFetch(url, { method: "GET" }, accessToken)
        : await blogPublicFetch(url);
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      posts?: PublicFeedPost[];
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, posts: data.posts ?? [] };
  },
  getUserRepostedPosts: async (
    username: string,
    limit = 24,
    accessToken?: string | null,
  ): Promise<{
    success: boolean;
    posts: PublicFeedPost[];
  }> => {
    const u = encodeURIComponent(username);
    const url = `${getApiBase()}/api/blog/u/${u}/reposts?limit=${encodeURIComponent(String(limit))}`;
    const r =
      accessToken != null && accessToken !== ""
        ? await blogAuthFetch(url, { method: "GET" }, accessToken)
        : await blogPublicFetch(url);
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      posts?: PublicFeedPost[];
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, posts: data.posts ?? [] };
  },
  getUserRepliedPosts: async (
    username: string,
    limit = 24,
    accessToken?: string | null,
  ): Promise<{
    success: boolean;
    posts: PublicFeedPost[];
  }> => {
    const u = encodeURIComponent(username);
    const url = `${getApiBase()}/api/blog/u/${u}/replies?limit=${encodeURIComponent(String(limit))}`;
    const r =
      accessToken != null && accessToken !== ""
        ? await blogAuthFetch(url, { method: "GET" }, accessToken)
        : await blogPublicFetch(url);
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      posts?: PublicFeedPost[];
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, posts: data.posts ?? [] };
  },
  getPublishedPost: async (
    username: string,
    slug: string,
    accessToken?: string | null,
  ): Promise<{
    success: boolean;
    post: PublicBlogPostDetail;
  }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const url = `${getApiBase()}/api/blog/p/${u}/${s}`;
    const r =
      accessToken != null && accessToken !== ""
        ? await blogAuthFetch(url, { method: "GET" }, accessToken)
        : await blogPublicFetch(url);
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      post?: PublicBlogPostDetail;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.post) throw new Error("Invalid response");
    return { success: true, post: data.post };
  },
  setPostRespect: async (
    username: string,
    slug: string,
    respecting: boolean,
    accessToken: string,
  ): Promise<{
    success: boolean;
    respecting: boolean;
    respectCount: number;
    achievements?: {
      newlyUnlocked: import("@/contracts/achievementsApi").AchievementUnlockDto[];
    };
  }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/respect`,
      { method: "POST", body: JSON.stringify({ respecting }) },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      respecting?: boolean;
      respectCount?: number;
      achievements?: {
        newlyUnlocked: import("@/contracts/achievementsApi").AchievementUnlockDto[];
      };
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: true,
      respecting: data.respecting === true,
      respectCount: data.respectCount ?? 0,
      achievements: data.achievements,
    };
  },
  setPostRepost: async (
    username: string,
    slug: string,
    reposting: boolean,
    accessToken: string,
  ): Promise<{
    success: boolean;
    reposting: boolean;
    repostCount: number;
  }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/repost`,
      { method: "POST", body: JSON.stringify({ reposting }) },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      reposting?: boolean;
      repostCount?: number;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: true,
      reposting: data.reposting === true,
      repostCount: data.repostCount ?? 0,
    };
  },
  setPostBookmark: async (
    username: string,
    slug: string,
    bookmarked: boolean,
    accessToken: string,
    options?: {
      groupId?: string;
    },
  ): Promise<{
    success: boolean;
    bookmarked: boolean;
    bookmarkCount: number;
  }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const body: {
      bookmarked: boolean;
      groupId?: string;
    } = { bookmarked };
    if (options?.groupId?.trim()) body.groupId = options.groupId.trim();
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/bookmark`,
      { method: "POST", body: JSON.stringify(body) },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      bookmarked?: boolean;
      bookmarkCount?: number;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: true,
      bookmarked: data.bookmarked === true,
      bookmarkCount: data.bookmarkCount ?? 0,
    };
  },
  postEngagementViewerState: async (
    postIds: string[],
    accessToken: string,
  ): Promise<{
    viewerRespectStates: Record<string, boolean>;
    viewerRepostStates: Record<string, boolean>;
    viewerBookmarkStates: Record<string, boolean>;
  }> => {
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/engagement/viewer-state`,
      { method: "POST", body: JSON.stringify({ postIds }) },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      viewerRespectStates?: Record<string, boolean>;
      viewerRepostStates?: Record<string, boolean>;
      viewerBookmarkStates?: Record<string, boolean>;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      viewerRespectStates: data.viewerRespectStates ?? {},
      viewerRepostStates: data.viewerRepostStates ?? {},
      viewerBookmarkStates: data.viewerBookmarkStates ?? {},
    };
  },
  startReadView: async (
    username: string,
    slug: string,
    accessToken: string,
  ): Promise<
    | {
        kind: "session";
        sessionId: string;
        minDwellMs: number;
      }
    | {
        kind: "self";
      }
    | {
        kind: "redis_unavailable";
        minDwellMs: number;
      }
  > => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/read/start`,
      { method: "POST" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      code?: string;
      sessionId?: string | null;
      reason?: string;
      minDwellMs?: number;
    };
    if (r.status === 503 && data.code === "READ_STREAK_REDIS_UNAVAILABLE") {
      return {
        kind: "redis_unavailable",
        minDwellMs: data.minDwellMs ?? 10000,
      };
    }
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (data.reason === "self") return { kind: "self" };
    if (!data.sessionId) throw new Error("Invalid read/start response");
    return {
      kind: "session",
      sessionId: data.sessionId,
      minDwellMs: data.minDwellMs ?? 10000,
    };
  },
  commitReadView: async (
    username: string,
    slug: string,
    accessToken: string,
    sessionId: string,
  ): Promise<{
    success: boolean;
    counted?: boolean;
    alreadyProcessed?: boolean;
    dayBucket?: string;
    reason?: string;
    redisApplied?: boolean;
    achievements?: {
      newlyUnlocked: import("@/contracts/achievementsApi").AchievementUnlockDto[];
    };
  }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/read/commit`,
      { method: "POST", body: JSON.stringify({ sessionId }) },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      counted?: boolean;
      alreadyProcessed?: boolean;
      dayBucket?: string;
      reason?: string;
      redisApplied?: boolean;
      achievements?: {
        newlyUnlocked: import("@/contracts/achievementsApi").AchievementUnlockDto[];
      };
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: data.success !== false,
      counted: data.counted,
      alreadyProcessed: data.alreadyProcessed,
      dayBucket: data.dayBucket,
      reason: data.reason,
      redisApplied: data.redisApplied,
      achievements: data.achievements,
    };
  },
  recordReadDay: async (
    username: string,
    slug: string,
    accessToken: string,
  ): Promise<{
    success: boolean;
    counted?: boolean;
    reason?: string;
  }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/read-day`,
      { method: "POST" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      counted?: boolean;
      reason?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: data.success !== false,
      counted: data.counted,
      reason: data.reason,
    };
  },
  getComments: async (
    username: string,
    slug: string,
    limit = 80,
    accessToken?: string | null,
  ): Promise<{
    success: boolean;
    comments: PublicBlogComment[];
    total: number;
  }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const url = `${getApiBase()}/api/blog/p/${u}/${s}/comments?limit=${encodeURIComponent(String(limit))}`;
    const r =
      accessToken && accessToken.trim() !== ""
        ? await blogAuthFetch(url, { method: "GET" }, accessToken)
        : await blogPublicFetch(url);
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      comments?: PublicBlogComment[];
      total?: number;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: true,
      comments: data.comments ?? [],
      total: typeof data.total === "number" ? data.total : 0,
    };
  },
  postComment: async (
    username: string,
    slug: string,
    text: string,
    accessToken: string,
    parentId?: string | null,
  ): Promise<{
    success: boolean;
    comment: PublicBlogComment;
  }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/comments`,
      {
        method: "POST",
        body: JSON.stringify({
          text,
          ...(parentId != null && parentId.trim() !== "" ? { parentId } : {}),
        }),
      },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      comment?: PublicBlogComment;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.comment) throw new Error("Invalid response");
    return { success: true, comment: data.comment };
  },
  patchComment: async (
    username: string,
    slug: string,
    commentId: string,
    text: string,
    accessToken: string,
  ): Promise<{
    success: boolean;
    comment: PublicBlogComment;
  }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const id = encodeURIComponent(commentId);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/comments/${id}`,
      { method: "PATCH", body: JSON.stringify({ text }) },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      comment?: PublicBlogComment;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.comment) throw new Error("Invalid response");
    return { success: true, comment: data.comment };
  },
  deleteComment: async (
    username: string,
    slug: string,
    commentId: string,
    accessToken: string,
  ): Promise<{
    success: boolean;
  }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const id = encodeURIComponent(commentId);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/comments/${id}`,
      { method: "DELETE" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true };
  },
  toggleCommentLike: async (
    username: string,
    slug: string,
    commentId: string,
    accessToken: string,
  ): Promise<{
    success: boolean;
    likeCount: number;
    likedByViewer: boolean;
  }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const id = encodeURIComponent(commentId);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/comments/${id}/like`,
      { method: "POST" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      likeCount?: number;
      likedByViewer?: boolean;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: true,
      likeCount: data.likeCount ?? 0,
      likedByViewer: data.likedByViewer === true,
    };
  },
  createPost: async (
    payload: CreatePostPayload,
    accessToken: string,
  ): Promise<{
    success: boolean;
    post: BlogPostResponse;
  }> => {
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      post?: BlogPostResponse;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as {
      success: boolean;
      post: BlogPostResponse;
    };
  },
  listMyPosts: async (
    accessToken: string,
    status?: "draft" | "published" | "deleted",
  ): Promise<{
    success: boolean;
    posts: BlogPostResponse[];
  }> => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog${qs}`,
      { method: "GET" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      posts?: BlogPostResponse[];
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as {
      success: boolean;
      posts: BlogPostResponse[];
    };
  },
  getDraft: async (accessToken: string): Promise<GetDraftResponse> => {
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/draft`,
      { method: "GET" },
      accessToken,
    );
    const data = (await readJson(r)) as GetDraftResponse & {
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as GetDraftResponse;
  },
  saveDraft: async (
    payload: {
      title: string;
      summary?: string;
      content: string;
      thumbnailUrl?: string;
      category?: string;
      tags?: string[];
      language?: string;
      squadId?: string | null;
    },
    accessToken: string,
  ): Promise<{
    success: boolean;
    post: BlogPostResponse;
  }> => {
    const body = { ...payload };
    if (body.squadId === undefined) delete body.squadId;
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/draft`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      post?: BlogPostResponse;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as {
      success: boolean;
      post: BlogPostResponse;
    };
  },
  getMyPost: async (
    postId: string,
    accessToken: string,
  ): Promise<{
    success: boolean;
    post: BlogPostResponse;
  }> => {
    const id = encodeURIComponent(postId.trim());
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/post/${id}`,
      { method: "GET" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      post?: BlogPostResponse;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.post) throw new Error("Invalid response");
    return data as {
      success: boolean;
      post: BlogPostResponse;
    };
  },
  updatePost: async (
    postId: string,
    payload: {
      title?: string;
      summary?: string;
      content?: string;
      thumbnailUrl?: string;
      status?: "draft" | "published";
      silent?: boolean;
      category?: string;
      tags?: string[];
      language?: string;
      squadId?: string | null;
    },
    accessToken: string,
  ): Promise<{
    success: boolean;
    post: BlogPostResponse;
    forkedFromPublished?: boolean;
  }> => {
    const id = encodeURIComponent(postId.trim());
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/post/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      post?: BlogPostResponse;
      forkedFromPublished?: boolean;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.post) throw new Error("Invalid response");
    return {
      success: true,
      post: data.post,
      forkedFromPublished: data.forkedFromPublished === true,
    };
  },
  deletePost: async (
    postId: string,
    accessToken: string,
  ): Promise<{
    success: boolean;
  }> => {
    const id = encodeURIComponent(postId.trim());
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/post/${id}`,
      { method: "DELETE" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true };
  },
  restorePost: async (
    postId: string,
    accessToken: string,
  ): Promise<{
    success: boolean;
    post: BlogPostResponse;
  }> => {
    const id = encodeURIComponent(postId.trim());
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/post/${id}/restore`,
      { method: "PUT" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      post?: BlogPostResponse;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.post) throw new Error("Invalid response");
    return { success: true, post: data.post };
  },
  purgePostPermanent: async (
    postId: string,
    accessToken: string,
  ): Promise<{
    success: boolean;
  }> => {
    const id = encodeURIComponent(postId.trim());
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/post/${id}/permanent`,
      { method: "DELETE" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true };
  },
  getCategoryMembersPreview: async (
    slugs: readonly string[],
  ): Promise<{
    success: boolean;
    categories: Record<
      string,
      {
        totalCount: number;
        members: {
          username: string;
          profileImg: string;
        }[];
      }
    >;
  }> => {
    const unique = [
      ...new Set(slugs.map((s) => s.trim().toLowerCase()).filter(Boolean)),
    ];
    if (unique.length === 0) {
      return { success: true, categories: {} };
    }
    const sp = new URLSearchParams();
    sp.set("slugs", unique.join(","));
    const r = await blogPublicFetch(
      `${getApiBase()}/api/blog/categories/members-preview?${sp.toString()}`,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      categories?: Record<
        string,
        {
          totalCount: number;
          members: {
            username: string;
            profileImg: string;
          }[];
        }
      >;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, categories: data.categories ?? {} };
  },
  listFollowedCategories: async (
    accessToken: string,
  ): Promise<{
    success: boolean;
    slugs: string[];
  }> => {
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/categories/following`,
      { method: "GET" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      slugs?: string[];
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, slugs: data.slugs ?? [] };
  },
  syncFollowedCategories: async (
    slugs: string[],
    accessToken: string,
  ): Promise<{
    success: boolean;
    synced: number;
  }> => {
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/categories/following/sync`,
      { method: "POST", body: JSON.stringify({ slugs }) },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      synced?: number;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, synced: data.synced ?? 0 };
  },
  followCategory: async (
    slug: string,
    accessToken: string,
  ): Promise<{
    success: boolean;
    following: boolean;
  }> => {
    const s = encodeURIComponent(slug.trim().toLowerCase());
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/categories/${s}/follow`,
      { method: "POST" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      following?: boolean;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, following: data.following === true };
  },
  unfollowCategory: async (
    slug: string,
    accessToken: string,
  ): Promise<{
    success: boolean;
    following: boolean;
  }> => {
    const s = encodeURIComponent(slug.trim().toLowerCase());
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/categories/${s}/follow`,
      { method: "DELETE" },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      following?: boolean;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, following: false };
  },
};
