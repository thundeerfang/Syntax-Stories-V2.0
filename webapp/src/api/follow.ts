import { resolvePublicApiBase } from '@/lib/publicApiBase';

const getApiBase = () => resolvePublicApiBase();

export interface FollowUser {
  id: string;
  username: string;
  fullName: string;
  profileImg?: string;
}

export interface FollowCounts {
  followersCount: number;
  followingCount: number;
}

export interface PublicProfileUser {
  id: string;
  username: string;
  fullName: string;
  profileImg?: string;
  coverBanner?: string;
  bio?: string;
  portfolioUrl?: string;
  linkedin?: string;
  github?: string;
  instagram?: string;
  youtube?: string;
  stackAndTools?: string[];
  mySetup?: Array<{ label: string; imageUrl: string; productUrl?: string }>;
  workExperiences?: unknown[];
  education?: unknown[];
  certifications?: unknown[];
  projects?: unknown[];
  openSourceContributions?: unknown[];
  createdAt?: string;
}

export const followApi = {
  searchUsers: (q: string) => {
    const query = q.trim();
    if (!query) return Promise.resolve({ success: true as const, list: [] as FollowUser[] });
    return fetch(`${getApiBase()}/api/follow/search?q=${encodeURIComponent(query)}`).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json() as Promise<{ success: boolean; list: FollowUser[] }>;
    });
  },

  getPublicProfile: (username: string) =>
    fetch(`${getApiBase()}/api/follow/profile/${encodeURIComponent(username)}`).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json() as Promise<{ success: boolean; user: PublicProfileUser; followersCount: number; followingCount: number }>;
    }),

  getFollowCounts: (username: string) =>
    fetch(`${getApiBase()}/api/follow/counts/${encodeURIComponent(username)}`).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json() as Promise<{ success: boolean; followersCount: number; followingCount: number }>;
    }),

  getFollowers: (username: string, cursor?: string | null, limit = 20) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', String(Math.min(limit, 50)));
    const qs = params.toString();
    const querySuffix = qs.length > 0 ? `?${qs}` : '';
    const path = `/api/follow/followers/${encodeURIComponent(username)}${querySuffix}`;
    return fetch(`${getApiBase()}${path}`).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json() as Promise<{ success: boolean; list: FollowUser[]; nextCursor: string | null }>;
    });
  },

  getFollowing: (username: string, cursor?: string | null, limit = 20) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', String(Math.min(limit, 50)));
    const qs = params.toString();
    const querySuffix = qs.length > 0 ? `?${qs}` : '';
    const path = `/api/follow/following/${encodeURIComponent(username)}${querySuffix}`;
    return fetch(`${getApiBase()}${path}`).then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json() as Promise<{ success: boolean; list: FollowUser[]; nextCursor: string | null }>;
    });
  },

  follow: async (username: string, accessToken: string) => {
    const r = await fetch(`${getApiBase()}/api/follow/${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    const data = (await r.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data;
  },

  unfollow: async (username: string, accessToken: string) => {
    const r = await fetch(`${getApiBase()}/api/follow/${encodeURIComponent(username)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await r.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return data;
  },

  checkFollowing: (username: string, accessToken: string) =>
    fetch(`${getApiBase()}/api/follow/check/${encodeURIComponent(username)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => {
      if (!r.ok) return { following: false };
      return r.json() as Promise<{ success: boolean; following: boolean }>;
    }),
};
