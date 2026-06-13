import { blogPublicFetch } from '@/lib/api/blogAuthFetch';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';
import type { SearchGroupKey, UnifiedSearchResponse } from '@contracts/searchApi';

const getApiBase = () => resolvePublicApiBase();

async function readJson<T>(r: Response): Promise<T> {
  const text = await r.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export type { SearchHit, UnifiedSearchResponse } from '@contracts/searchApi';

export const searchApi = {
  unified: async (
    q: string,
    opts?: { types?: SearchGroupKey[] | 'all'; limit?: number }
  ): Promise<UnifiedSearchResponse> => {
    const sp = new URLSearchParams();
    sp.set('q', q.trim());
    if (opts?.types && opts.types !== 'all') {
      sp.set('types', opts.types.join(','));
    }
    if (opts?.limit != null) sp.set('limit', String(opts.limit));

    const r = await blogPublicFetch(`${getApiBase()}/api/search?${sp.toString()}`);
    const data = (await readJson(r)) as UnifiedSearchResponse & { message?: string };
    if (!r.ok) throw new Error(data.message ?? r.statusText);
    return {
      success: true,
      q: data.q ?? q.trim(),
      minChars: data.minChars ?? 3,
      cached: data.cached,
      tookMs: data.tookMs,
      groups: data.groups ?? {},
    };
  },
};
