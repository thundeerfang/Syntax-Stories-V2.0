import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';
import type { AchievementDef } from '../../achievements/achievement.types.js';
import { loadActiveAchievementCatalog } from './achievementCatalogStore.js';
import { buildAchievementMetricIndex, type AchievementMetricIndex } from './metricIndex.js';
import { ACHIEVEMENT_CATALOG_TTL_SEC } from '../../variable/constants.js';

type CachedCatalog = {
  catalog: AchievementDef[];
  byId: Record<string, AchievementDef>;
  total: number;
  version: number;
  metricIndex: Record<string, AchievementDef[]>;
};

let memoryCache: {
  data: CachedCatalog;
  metricIndex: AchievementMetricIndex;
  expiresAt: number;
} | null = null;

function serializeCatalog(
  catalog: AchievementDef[],
  byId: Map<string, AchievementDef>,
  total: number,
  version: number,
  metricIndex: AchievementMetricIndex
): CachedCatalog {
  const metricIndexObj: Record<string, AchievementDef[]> = {};
  for (const [k, v] of metricIndex) {
    metricIndexObj[k] = v;
  }
  const byIdObj: Record<string, AchievementDef> = {};
  for (const [k, v] of byId) {
    byIdObj[k] = v;
  }
  return { catalog, byId: byIdObj, total, version, metricIndex: metricIndexObj };
}

export async function invalidateAchievementCatalogCache(): Promise<void> {
  memoryCache = null;
  const redis = getRedis();
  if (!redis) return;
  try {
    const keys = await redis.keys('achievement:catalog:*');
    if (keys.length) await redis.del(keys);
  } catch {
    /* ignore */
  }
}

export async function getCachedAchievementCatalog(): Promise<{
  catalog: AchievementDef[];
  byId: Map<string, AchievementDef>;
  total: number;
  version: number;
  metricIndex: AchievementMetricIndex;
}> {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) {
    return {
      catalog: memoryCache.data.catalog,
      byId: new Map(Object.entries(memoryCache.data.byId)),
      total: memoryCache.data.total,
      version: memoryCache.data.version,
      metricIndex: memoryCache.metricIndex,
    };
  }

  const loaded = await loadActiveAchievementCatalog();
  const metricIndex = buildAchievementMetricIndex(loaded.catalog);
  const redis = getRedis();
  const cacheKey = redisKeys.achievements.catalog(loaded.version);

  if (redis) {
    try {
      const raw = await redis.get(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedCatalog;
        const idx = new Map(Object.entries(parsed.metricIndex)) as AchievementMetricIndex;
        memoryCache = {
          data: parsed,
          metricIndex: idx,
          expiresAt: now + ACHIEVEMENT_CATALOG_TTL_SEC * 1000,
        };
        return {
          catalog: parsed.catalog,
          byId: new Map(Object.entries(parsed.byId)),
          total: parsed.total,
          version: parsed.version,
          metricIndex: idx,
        };
      }
    } catch {
      /* fall through */
    }
  }

  const serialized = serializeCatalog(
    loaded.catalog,
    loaded.byId,
    loaded.total,
    loaded.version,
    metricIndex
  );

  if (redis) {
    try {
      await redis.setEx(cacheKey, ACHIEVEMENT_CATALOG_TTL_SEC, JSON.stringify(serialized));
    } catch {
      /* ignore */
    }
  }

  memoryCache = {
    data: serialized,
    metricIndex,
    expiresAt: now + ACHIEVEMENT_CATALOG_TTL_SEC * 1000,
  };

  return {
    catalog: loaded.catalog,
    byId: loaded.byId,
    total: loaded.total,
    version: loaded.version,
    metricIndex,
  };
}
