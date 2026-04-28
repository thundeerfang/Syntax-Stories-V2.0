import { blogAuthFetch, blogPublicFetch } from '@/lib/blogAuthFetch';
import { resolvePublicApiBase } from '@/lib/publicApiBase';
import type { PublicBlogComment, PublicBlogPostDetail, PublicFeedPost } from '@/types/blog';

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
}

export interface GetDraftResponse {
  success: boolean;
  draft: BlogPostResponse | null;
}

export const blogApi = {
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
    payload: { title: string; summary?: string; content: string; thumbnailUrl?: string },
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
