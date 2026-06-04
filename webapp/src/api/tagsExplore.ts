import { blogPublicFetch } from '@/lib/api/blogAuthFetch';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';
import type {
  CategoryListSort,
  PaginatedCategoriesResponse,
  PaginatedTagsResponse,
  TagExploreRow,
  TagListSort,
  TagsExploreResponse,
} from '@contracts/tagsExploreApi';

const getApiBase = () => resolvePublicApiBase();

async function readJson<T>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export type { TagExploreRow } from '@contracts/tagsExploreApi';

/** Public GET /api/blog/tags/explore — rank cards only (no full tag list). */
export async function fetchTagsExplore(): Promise<TagsExploreResponse> {
  const r = await blogPublicFetch(`${getApiBase()}/api/blog/tags/explore`);
  const data = (await readJson(r)) as TagsExploreResponse & { message?: string };
  if (!r.ok) throw new Error(data.message ?? r.statusText);
  return {
    success: true,
    trending: data.trending ?? [],
    popular: data.popular ?? [],
    recent: data.recent ?? [],
  };
}

/** Public GET /api/blog/tags/list — paginated tag list for Topics infinite scroll. */
export async function fetchTagsList(opts?: {
  offset?: number;
  limit?: number;
  sort?: TagListSort;
  q?: string;
}): Promise<PaginatedTagsResponse> {
  const sp = new URLSearchParams();
  if (opts?.offset != null) sp.set('offset', String(opts.offset));
  if (opts?.limit != null) sp.set('limit', String(opts.limit));
  if (opts?.sort) sp.set('sort', opts.sort);
  if (opts?.q?.trim()) sp.set('q', opts.q.trim());
  const qs = sp.toString();
  const url = `${getApiBase()}/api/blog/tags/list${qs ? `?${qs}` : ''}`;
  const r = await blogPublicFetch(url);
  const data = (await readJson(r)) as PaginatedTagsResponse & { message?: string };
  if (!r.ok) throw new Error(data.message ?? r.statusText);
  return {
    success: true,
    list: data.list ?? [],
    total: data.total ?? 0,
    offset: data.offset ?? 0,
    limit: data.limit ?? 0,
    hasMore: data.hasMore ?? false,
  };
}

/** Public GET /api/blog/taxonomy/categories — paginated category list for Topics. */
export async function fetchCategoriesList(opts?: {
  offset?: number;
  limit?: number;
  sort?: CategoryListSort;
  q?: string;
}): Promise<PaginatedCategoriesResponse> {
  const sp = new URLSearchParams();
  if (opts?.offset != null) sp.set('offset', String(opts.offset));
  if (opts?.limit != null) sp.set('limit', String(opts.limit));
  if (opts?.sort) sp.set('sort', opts.sort);
  if (opts?.q?.trim()) sp.set('q', opts.q.trim());
  const qs = sp.toString();
  const url = `${getApiBase()}/api/blog/taxonomy/categories${qs ? `?${qs}` : ''}`;
  const r = await blogPublicFetch(url);
  const data = (await readJson(r)) as PaginatedCategoriesResponse & { message?: string };
  if (!r.ok) throw new Error(data.message ?? r.statusText);
  return {
    success: true,
    list: data.list ?? [],
    total: data.total ?? 0,
    offset: data.offset ?? 0,
    limit: data.limit ?? 0,
    hasMore: data.hasMore ?? false,
  };
}
