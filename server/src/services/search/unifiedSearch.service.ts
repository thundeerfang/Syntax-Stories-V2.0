import { performance } from 'node:perf_hooks';
import { getRedis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { redisKeys } from '../../shared/redis/keys.js';
import { searchFlexIndex } from './flexIndex.js';
import { loadSearchIndexFromRedis } from './searchIndex.service.js';
import { searchBlogsForUnified } from './searchBlogs.service.js';
import { searchFeaturesForUnified } from './searchFeatures.service.js';
import { searchSquadsForUnified } from './searchSquads.service.js';
import {
  searchCategoriesForUnified,
  searchTagsForUnified,
} from './searchTaxonomy.service.js';
import { searchUsersForUnified } from './searchUsers.service.js';
import type { SearchGroups, UnifiedSearchResult } from './search.types.js';
import {
  hashSearchQuery,
  normalizeSearchQuery,
  SEARCH_MIN_CHARS,
} from './searchQuery.util.js';

type SearchTypeKey = keyof SearchGroups;

async function searchTagsIndexed(q: string, limit: number) {
  const docs = await loadSearchIndexFromRedis(redisKeys.search.index.tags);
  if (docs?.length) return searchFlexIndex('tags', docs, q, limit);
  return searchTagsForUnified(q, limit);
}

async function searchCategoriesIndexed(q: string, limit: number) {
  const docs = await loadSearchIndexFromRedis(redisKeys.search.index.categories);
  if (docs?.length) return searchFlexIndex('categories', docs, q, limit);
  return searchCategoriesForUnified(q, limit);
}

async function searchSquadsIndexed(q: string, limit: number) {
  const docs = await loadSearchIndexFromRedis(redisKeys.search.index.squads);
  if (docs?.length) return searchFlexIndex('squads', docs, q, limit);
  return searchSquadsForUnified(q, limit);
}

async function searchFeaturesIndexed(q: string, limit: number) {
  const docs = await loadSearchIndexFromRedis(redisKeys.search.index.features);
  if (docs?.length) return searchFlexIndex('features', docs, q, limit);
  return searchFeaturesForUnified(q, limit);
}

async function runTypeSearch(
  type: SearchTypeKey,
  q: string,
  limit: number
): Promise<SearchGroups[SearchTypeKey]> {
  try {
    switch (type) {
      case 'users':
        return await searchUsersForUnified(q, limit);
      case 'tags':
        return await searchTagsIndexed(q, limit);
      case 'categories':
        return await searchCategoriesIndexed(q, limit);
      case 'squads':
        return await searchSquadsIndexed(q, limit);
      case 'blogs':
        return await searchBlogsForUnified(q, limit);
      case 'features':
        return searchFeaturesIndexed(q, limit);
      default:
        return [];
    }
  } catch (e) {
    console.warn(`[search] ${type} failed:`, String(e));
    return [];
  }
}

function cacheKey(q: string, types: string[], limit: number): string {
  const typesKey = [...types].sort().join(',');
  return hashSearchQuery(`${q}|${typesKey}|${limit}`);
}

export async function unifiedSearch(opts: {
  q: string;
  types: string[];
  limit: number;
  minChars?: number;
}): Promise<UnifiedSearchResult> {
  const t0 = performance.now();
  const q = normalizeSearchQuery(opts.q);
  const minChars = opts.minChars ?? SEARCH_MIN_CHARS;

  if (q.length < minChars) {
    return {
      success: true,
      q,
      minChars,
      cached: false,
      tookMs: performance.now() - t0,
      groups: {},
    };
  }

  const types = opts.types.filter((t): t is SearchTypeKey =>
    ['users', 'tags', 'categories', 'squads', 'blogs', 'features'].includes(t)
  );
  const limit = opts.limit;
  const redis = getRedis();
  const qHash = cacheKey(q, types, limit);

  if (redis) {
    const hit = await redis.get(redisKeys.search.result(qHash));
    if (hit) {
      const parsed = JSON.parse(hit) as UnifiedSearchResult;
      return {
        ...parsed,
        cached: true,
        tookMs: performance.now() - t0,
      };
    }
  }

  const entries = await Promise.all(
    types.map(async (type) => [type, await runTypeSearch(type, q, limit)] as const)
  );

  const groups: SearchGroups = {};
  for (const [type, list] of entries) {
    if (list && list.length > 0) groups[type] = list;
  }

  const body: UnifiedSearchResult = {
    success: true,
    q,
    minChars,
    cached: false,
    tookMs: performance.now() - t0,
    groups,
  };

  if (redis) {
    void redis.set(redisKeys.search.result(qHash), JSON.stringify(body), {
      EX: env.SEARCH_CACHE_TTL_SEC,
    });
  }

  return body;
}
