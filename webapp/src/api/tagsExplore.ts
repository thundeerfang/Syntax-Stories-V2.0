import { blogPublicFetch } from '@/lib/api/blogAuthFetch';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';

const getApiBase = () => resolvePublicApiBase();

async function readJson<T>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export type { TagExploreRow } from '@contracts/tagsExploreApi';
import type { TagExploreRow } from '@contracts/tagsExploreApi';

/** Public GET /api/blog/tags/explore — kept out of `blog.ts` so `/topics` does not pull the full blog API bundle during dev compile. */
export async function fetchTagsExplore(): Promise<{
  success: boolean;
  trending: TagExploreRow[];
  popular: TagExploreRow[];
  recent: TagExploreRow[];
  allTags: TagExploreRow[];
}> {
  const r = await blogPublicFetch(`${getApiBase()}/api/blog/tags/explore`);
  const data = (await readJson(r)) as {
    success?: boolean;
    message?: string;
    trending?: TagExploreRow[];
    popular?: TagExploreRow[];
    recent?: TagExploreRow[];
    allTags?: TagExploreRow[];
  };
  if (!r.ok) throw new Error(data.message ?? r.statusText);
  return {
    success: true,
    trending: data.trending ?? [],
    popular: data.popular ?? [],
    recent: data.recent ?? [],
    allTags: data.allTags ?? [],
  };
}
