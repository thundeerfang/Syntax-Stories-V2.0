import { blogAuthFetch } from '@/lib/api/blogAuthFetch';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';
import type { PublicFeedPost } from '@/types/blog';

const getApiBase = () => resolvePublicApiBase();

async function readJson<T>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export type { BookmarkGroupRow } from '@contracts/bookmarksApi';
import type { BookmarkGroupRow, PatchBookmarkGroupBody } from '@contracts/bookmarksApi';

export const bookmarksApi = {
  listGroups: async (
    accessToken: string
  ): Promise<{ success: boolean; groups: BookmarkGroupRow[] }> => {
    const r = await blogAuthFetch(
      `${getApiBase()}/api/bookmarks/groups`,
      { method: 'GET' },
      accessToken
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      groups?: BookmarkGroupRow[];
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    const groups = (data.groups ?? []).map((g) => ({
      ...g,
      emoji: typeof g.emoji === 'string' ? g.emoji : '',
      bookmarkCount: typeof g.bookmarkCount === 'number' ? g.bookmarkCount : 0,
    }));
    return { success: true, groups };
  },

  createGroup: async (
    name: string,
    accessToken: string,
    opts?: { emoji?: string; makeDefault?: boolean }
  ): Promise<{ success: boolean; group: BookmarkGroupRow }> => {
    const body: { name: string; emoji?: string; makeDefault?: boolean } = { name: name.trim() };
    if (opts?.emoji != null && opts.emoji !== '') body.emoji = opts.emoji;
    if (opts?.makeDefault === true) body.makeDefault = true;
    const r = await blogAuthFetch(
      `${getApiBase()}/api/bookmarks/groups`,
      { method: 'POST', body: JSON.stringify(body) },
      accessToken
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      group?: BookmarkGroupRow;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.group) throw new Error('Invalid response');
    return { success: true, group: data.group };
  },

  setDefaultGroup: async (groupId: string, accessToken: string): Promise<void> => {
    const r = await blogAuthFetch(
      `${getApiBase()}/api/bookmarks/groups/${encodeURIComponent(groupId)}`,
      { method: 'PATCH', body: JSON.stringify({ isDefault: true }) },
      accessToken
    );
    const data = (await readJson(r)) as { success?: boolean; message?: string };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
  },

  updateGroup: async (
    groupId: string,
    accessToken: string,
    patch: PatchBookmarkGroupBody
  ): Promise<{ success: boolean; group: BookmarkGroupRow }> => {
    const body: PatchBookmarkGroupBody = {};
    if (patch.name != null) body.name = patch.name.trim();
    if (patch.emoji !== undefined) body.emoji = patch.emoji;
    const r = await blogAuthFetch(
      `${getApiBase()}/api/bookmarks/groups/${encodeURIComponent(groupId)}`,
      { method: 'PATCH', body: JSON.stringify(body) },
      accessToken
    );
    const data = (await readJson(r)) as {
      success?: boolean;
      group?: BookmarkGroupRow;
      message?: string;
    };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    if (!data.group) throw new Error('Invalid response');
    return { success: true, group: data.group };
  },

  deleteGroup: async (groupId: string, accessToken: string): Promise<void> => {
    const r = await blogAuthFetch(
      `${getApiBase()}/api/bookmarks/groups/${encodeURIComponent(groupId)}`,
      { method: 'DELETE' },
      accessToken
    );
    const data = (await readJson(r)) as { success?: boolean; message?: string };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
  },

  listBookmarkedPosts: async (
    accessToken: string,
    options?: { groupId?: string; q?: string; limit?: number; sort?: 'newest' | 'oldest' }
  ): Promise<{ success: boolean; posts: PublicFeedPost[] }> => {
    const sp = new URLSearchParams();
    if (options?.groupId) sp.set('groupId', options.groupId);
    if (options?.q?.trim()) sp.set('q', options.q.trim());
    if (options?.limit != null) sp.set('limit', String(options.limit));
    if (options?.sort === 'oldest') sp.set('sort', 'oldest');
    const q = sp.toString();
    const r = await blogAuthFetch(
      `${getApiBase()}/api/bookmarks/posts${q ? `?${q}` : ''}`,
      { method: 'GET' },
      accessToken
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
