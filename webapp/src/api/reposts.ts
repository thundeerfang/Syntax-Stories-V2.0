import { blogAuthFetch } from '@/lib/api/blogAuthFetch';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';
import type { PublicFeedPost } from '@/types/blog';

const getApiBase = () => resolvePublicApiBase();

async function readJson<T>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export const repostsApi = {
  listRepostedPosts: async (
    accessToken: string,
    options?: { q?: string; limit?: number; sort?: 'newest' | 'oldest' },
  ): Promise<{ success: boolean; posts: PublicFeedPost[] }> => {
    const sp = new URLSearchParams();
    if (options?.q?.trim()) sp.set('q', options.q.trim());
    if (options?.limit != null) sp.set('limit', String(options.limit));
    if (options?.sort === 'oldest') sp.set('sort', 'oldest');
    const q = sp.toString();
    const r = await blogAuthFetch(
      `${getApiBase()}/api/reposts/posts${q ? `?${q}` : ''}`,
      { method: 'GET' },
      accessToken,
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      posts?: PublicFeedPost[];
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return { success: true, posts: data.posts ?? [] };
  },
};
