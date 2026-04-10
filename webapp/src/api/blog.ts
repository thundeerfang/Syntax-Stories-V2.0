import { resolvePublicApiBase } from '@/lib/publicApiBase';
import type { PublicBlogPostDetail, PublicFeedPost } from '@/types/blog';

const getApiBase = () => resolvePublicApiBase();

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
}

export interface GetDraftResponse {
  success: boolean;
  draft: BlogPostResponse | null;
}

export const blogApi = {
  getPublishedFeed: async (limit = 24): Promise<{ success: boolean; posts: PublicFeedPost[] }> => {
    const r = await fetch(`${getApiBase()}/api/blog/feed?limit=${encodeURIComponent(String(limit))}`);
    const data = (await r.json().catch(() => ({}))) as { success?: boolean; message?: string; posts?: PublicFeedPost[] };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, posts: data.posts ?? [] };
  },

  getPublishedPost: async (
    username: string,
    slug: string,
  ): Promise<{ success: boolean; post: PublicBlogPostDetail }> => {
    const u = encodeURIComponent(username);
    const s = encodeURIComponent(slug);
    const r = await fetch(`${getApiBase()}/api/blog/p/${u}/${s}`);
    const data = (await r.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      post?: PublicBlogPostDetail;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.post) throw new Error('Invalid response');
    return { success: true, post: data.post };
  },

  createPost: async (payload: CreatePostPayload, accessToken: string): Promise<{ success: boolean; post: BlogPostResponse }> => {
    const r = await fetch(`${getApiBase()}/api/blog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await r.json().catch(() => ({}))) as { success?: boolean; message?: string; post?: BlogPostResponse };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as { success: boolean; post: BlogPostResponse };
  },

  listMyPosts: async (accessToken: string, status?: 'draft' | 'published'): Promise<{ success: boolean; posts: BlogPostResponse[] }> => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const r = await fetch(`${getApiBase()}/api/blog${qs}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await r.json().catch(() => ({}))) as { success?: boolean; message?: string; posts?: BlogPostResponse[] };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as { success: boolean; posts: BlogPostResponse[] };
  },

  getDraft: async (accessToken: string): Promise<GetDraftResponse> => {
    const r = await fetch(`${getApiBase()}/api/blog/draft`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await r.json().catch(() => ({}))) as GetDraftResponse & { message?: string };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as GetDraftResponse;
  },

  saveDraft: async (
    payload: { title: string; summary?: string; content: string; thumbnailUrl?: string },
    accessToken: string
  ): Promise<{ success: boolean; post: BlogPostResponse }> => {
    const r = await fetch(`${getApiBase()}/api/blog/draft`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await r.json().catch(() => ({}))) as { success?: boolean; message?: string; post?: BlogPostResponse };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data as { success: boolean; post: BlogPostResponse };
  },
};
