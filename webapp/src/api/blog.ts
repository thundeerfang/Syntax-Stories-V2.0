import { blogAuthFetch, blogPublicFetch } from '@/lib/blogAuthFetch';
import { resolvePublicApiBase } from '@/lib/publicApiBase';
import type {
  BlogTaxonomyRow,
  PublicBlogComment,
  PublicBlogPostDetail,
  PublicFeedPost,
} from '@/types/blog';

const getApiBase = () => resolvePublicApiBase();

async function readJson<T>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

/** Only http(s) URLs — never `blob:` / `data:` previews — for draft/post thumbnail fields. */
export function pickRemoteThumbnailForApi(preview: string | null | undefined): string | undefined {
  if (preview == null || typeof preview !== 'string') return undefined;
  const t = preview.trim();
  if (!t.startsWith('http://') && !t.startsWith('https://')) return undefined;
  return t.slice(0, 2000);
}

export interface CreatePostPayload {
  title: string;
  summary?: string;
  content: string;
  thumbnailUrl?: string;
  status?: 'draft' | 'published';
  category?: string;
  tags?: string[];
  language?: string;
}

export interface BlogPostResponse {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  thumbnailUrl?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  /** Present when listing soft-deleted posts (`status=deleted`). */
  deletedAt?: string;
  category?: string;
  tags?: string[];
  language?: string;
}

export interface GetDraftResponse {
  success: boolean;
  draft: BlogPostResponse | null;
}

export const blogApi = {
  getTaxonomy: async (): Promise<{ success: boolean; categories: BlogTaxonomyRow[]; tags: BlogTaxonomyRow[] }> => {
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

  getPublishedFeed: async (limit = 24): Promise<{ success: boolean; posts: PublicFeedPost[] }> => {
    const r = await blogPublicFetch(`${getApiBase()}/api/blog/feed?limit=${encodeURIComponent(String(limit))}`);
    const data = (await readJson(r)) as { success?: boolean; message?: string; posts?: PublicFeedPost[] };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, posts: data.posts ?? [] };
  },

  getUserPublishedPosts: async (
    username: string,
    limit = 24,
  ): Promise<{ success: boolean; posts: PublicFeedPost[] }> => {
    const u = encodeURIComponent(username);
    const r = await blogPublicFetch(
      `${getApiBase()}/api/blog/u/${u}/posts?limit=${encodeURIComponent(String(limit))}`,
    );
    const data = (await readJson(r)) as { success?: boolean; message?: string; posts?: PublicFeedPost[] };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, posts: data.posts ?? [] };
  },

  getPublishedPost: async (
    username: string,
    slug: string,
  ): Promise<{ success: boolean; post: PublicBlogPostDetail }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await blogPublicFetch(`${getApiBase()}/api/blog/p/${u}/${s}`);
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      post?: PublicBlogPostDetail;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.post) throw new Error('Invalid response');
    return { success: true, post: data.post };
  },

  /** VIEW_START — returns session for VIEW_COMMIT when Redis is available (BLOG_READ_STREAK §16). */
  startReadView: async (
    username: string,
    slug: string,
    accessToken: string,
  ): Promise<
    | { kind: 'session'; sessionId: string; minDwellMs: number }
    | { kind: 'self' }
    | { kind: 'redis_unavailable'; minDwellMs: number }
  > => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/read/start`,
      { method: 'POST' },
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
    if (r.status === 503 && data.code === 'READ_STREAK_REDIS_UNAVAILABLE') {
      return { kind: 'redis_unavailable', minDwellMs: data.minDwellMs ?? 10_000 };
    }
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (data.reason === 'self') return { kind: 'self' };
    if (!data.sessionId) throw new Error('Invalid read/start response');
    return { kind: 'session', sessionId: data.sessionId, minDwellMs: data.minDwellMs ?? 10_000 };
  },

  /** VIEW_COMMIT — merged Redis path; requires prior startReadView session. */
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
  }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/read/commit`,
      { method: 'POST', body: JSON.stringify({ sessionId }) },
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
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: data.success !== false,
      counted: data.counted,
      alreadyProcessed: data.alreadyProcessed,
      dayBucket: data.dayBucket,
      reason: data.reason,
      redisApplied: data.redisApplied,
    };
  },

  /** Records today (UTC) as a reading day for streaks; no-op for guests or when reading your own post. */
  recordReadDay: async (
    username: string,
    slug: string,
    accessToken: string,
  ): Promise<{ success: boolean; counted?: boolean; reason?: string }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/read-day`,
      { method: 'POST' },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      counted?: boolean;
      reason?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: data.success !== false, counted: data.counted, reason: data.reason };
  },

  getComments: async (
    username: string,
    slug: string,
    limit = 80,
  ): Promise<{ success: boolean; comments: PublicBlogComment[] }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await blogPublicFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/comments?limit=${encodeURIComponent(String(limit))}`,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      comments?: PublicBlogComment[];
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, comments: data.comments ?? [] };
  },

  postComment: async (
    username: string,
    slug: string,
    text: string,
    accessToken: string,
  ): Promise<{ success: boolean; comment: PublicBlogComment }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/p/${u}/${s}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ text }),
      },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      message?: string;
      comment?: PublicBlogComment;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.comment) throw new Error('Invalid response');
    return { success: true, comment: data.comment };
  },

  createPost: async (
    payload: CreatePostPayload,
    accessToken: string,
  ): Promise<{ success: boolean; post: BlogPostResponse }> => {
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      accessToken,
    );
    const data = (await readJson(r)) as { success?: boolean; message?: string; post?: BlogPostResponse };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as { success: boolean; post: BlogPostResponse };
  },

  listMyPosts: async (
    accessToken: string,
    status?: 'draft' | 'published' | 'deleted',
  ): Promise<{ success: boolean; posts: BlogPostResponse[] }> => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const r = await blogAuthFetch(`${getApiBase()}/api/blog${qs}`, { method: 'GET' }, accessToken);
    const data = (await readJson(r)) as { success?: boolean; message?: string; posts?: BlogPostResponse[] };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as { success: boolean; posts: BlogPostResponse[] };
  },

  getDraft: async (accessToken: string): Promise<GetDraftResponse> => {
    const r = await blogAuthFetch(`${getApiBase()}/api/blog/draft`, { method: 'GET' }, accessToken);
    const data = (await readJson(r)) as GetDraftResponse & { message?: string };
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
    },
    accessToken: string,
  ): Promise<{ success: boolean; post: BlogPostResponse }> => {
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/draft`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      accessToken,
    );
    const data = (await readJson(r)) as { success?: boolean; message?: string; post?: BlogPostResponse };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as { success: boolean; post: BlogPostResponse };
  },

  getMyPost: async (postId: string, accessToken: string): Promise<{ success: boolean; post: BlogPostResponse }> => {
    const id = encodeURIComponent(postId.trim());
    const r = await blogAuthFetch(`${getApiBase()}/api/blog/post/${id}`, { method: 'GET' }, accessToken);
    const data = (await readJson(r)) as { success?: boolean; message?: string; post?: BlogPostResponse };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.post) throw new Error('Invalid response');
    return data as { success: boolean; post: BlogPostResponse };
  },

  updatePost: async (
    postId: string,
    payload: {
      title?: string;
      summary?: string;
      content?: string;
      thumbnailUrl?: string;
      status?: 'draft' | 'published';
      silent?: boolean;
      category?: string;
      tags?: string[];
      language?: string;
    },
    accessToken: string,
  ): Promise<{ success: boolean; post: BlogPostResponse; forkedFromPublished?: boolean }> => {
    const id = encodeURIComponent(postId.trim());
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/post/${id}`,
      {
        method: 'PUT',
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
    if (!data.post) throw new Error('Invalid response');
    return {
      success: true,
      post: data.post,
      forkedFromPublished: data.forkedFromPublished === true,
    };
  },

  deletePost: async (postId: string, accessToken: string): Promise<{ success: boolean }> => {
    const id = encodeURIComponent(postId.trim());
    const r = await blogAuthFetch(`${getApiBase()}/api/blog/post/${id}`, { method: 'DELETE' }, accessToken);
    const data = (await readJson(r)) as { success?: boolean; message?: string };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true };
  },

  restorePost: async (postId: string, accessToken: string): Promise<{ success: boolean; post: BlogPostResponse }> => {
    const id = encodeURIComponent(postId.trim());
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/post/${id}/restore`,
      { method: 'PUT' },
      accessToken,
    );
    const data = (await readJson(r)) as { success?: boolean; message?: string; post?: BlogPostResponse };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.post) throw new Error('Invalid response');
    return { success: true, post: data.post };
  },

  purgePostPermanent: async (postId: string, accessToken: string): Promise<{ success: boolean }> => {
    const id = encodeURIComponent(postId.trim());
    const r = await blogAuthFetch(
      `${getApiBase()}/api/blog/post/${id}/permanent`,
      { method: 'DELETE' },
      accessToken,
    );
    const data = (await readJson(r)) as { success?: boolean; message?: string };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true };
  },
};
