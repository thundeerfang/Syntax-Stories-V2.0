import mongoose from 'mongoose';
import type {
  AchievementDef,
  AchievementEvent,
  AchievementProgressItemDto,
  AchievementUnlockDto,
} from '../../achievements/achievement.types.js';
import type { MetricSnapshot } from '../../achievements/achievement.types.js';
import { writeAchievementAudit } from '../../shared/audit/auditLog.js';
import { AchievementProgressModel } from '../../models/AchievementProgress.js';
import { AchievementUnlockModel } from '../../models/AchievementUnlock.js';
import { UserAchievementProgressModel } from '../../models/UserAchievementProgress.js';
import { getRedis } from '../../config/redis.js';
import { redisKeys } from '../../shared/redis/keys.js';
import { getCachedAchievementCatalog } from './achievementCatalogCache.js';
import {
  filterCatalogByMetrics,
  metricsAffectedByEvents,
} from './metricIndex.js';
import {
  addXpAndPoints,
  applyAchievementEventsToUserStats,
  getOrCreateUserStats,
  userStatsToMetricSnapshot,
  levelFromXp,
} from './userStats.service.js';
import { addLeaderboardScore } from './leaderboard.service.js';
import { notifyAchievementUnlocks } from './achievementNotifications.service.js';
import { publishAchievementUnlockRealtime } from './achievementUnlockRealtime.service.js';

function toUnlockDto(def: AchievementDef, snapshot: MetricSnapshot): AchievementUnlockDto {
  const current = snapshot[def.metric] ?? 0;
  return {
    id: def.id,
    slug: def.slug,
    title: def.title,
    description: def.description,
    category: def.category,
    points: def.points,
    celebrateAs: def.celebrateAs,
    metric: def.metric,
    target: def.target,
    current,
  };
}

function metricValue(metric: AchievementProgressItemDto['metric'], snapshot: MetricSnapshot): number {
  return snapshot[metric] ?? 0;
}

function isUnlocked(
  def: AchievementDef,
  snapshot: MetricSnapshot,
  unlockedIds: Set<string>
): boolean {
  if (def.unlocksAfter && !unlockedIds.has(def.unlocksAfter)) return false;
  return metricValue(def.metric, snapshot) >= def.target;
}

async function persistProgressRows(
  userId: string,
  catalog: AchievementDef[],
  snapshot: MetricSnapshot,
  unlockedIds: Set<string>
): Promise<void> {
  const oid = new mongoose.Types.ObjectId(userId);
  const ops = catalog.map((def) => {
    const current = Math.min(metricValue(def.metric, snapshot), def.target);
    const pct =
      def.target > 0 ? Math.min(100, Math.round((current / def.target) * 100)) : 0;
    const locked = Boolean(def.unlocksAfter && !unlockedIds.has(def.unlocksAfter));
    if (locked || unlockedIds.has(def.id)) {
      return null;
    }
    return AchievementProgressModel.updateOne(
      { userId: oid, achievementId: def.id },
      {
        $set: {
          current,
          target: def.target,
          percentage: pct,
        },
        $setOnInsert: { userId: oid, achievementId: def.id },
      },
      { upsert: true }
    );
  });
  await Promise.all(ops.filter(Boolean));
}

async function tryAcquireUnlockLock(userId: string, achievementId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  try {
    const key = redisKeys.achievements.lock(userId, achievementId);
    const ok = await redis.set(key, '1', { NX: true, EX: 30 });
    return ok === 'OK';
  } catch {
    return true;
  }
}

async function recordUnlock(
  userId: string,
  def: AchievementDef,
  snapshot: MetricSnapshot,
  sourceEvent?: string
): Promise<AchievementUnlockDto | null> {
  const acquired = await tryAcquireUnlockLock(userId, def.id);
  if (!acquired) return null;

  const oid = new mongoose.Types.ObjectId(userId);
  const xp = def.points;

  try {
    await AchievementUnlockModel.create({
      userId: oid,
      achievementId: def.id,
      pointsAwarded: def.points,
      xpAwarded: xp,
      unlockedAt: new Date(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('duplicate key') || msg.includes('E11000')) return null;
    throw e;
  }

  await addXpAndPoints(userId, def.points, xp);
  void addLeaderboardScore(userId, def.points);

  await writeAchievementAudit({
    userId: oid,
    action: 'unlocked',
    achievementId: def.id,
    sourceEvent,
    metadata: { points: def.points, xp },
  });

  const legacy = await UserAchievementProgressModel.findOne({ userId: oid });
  if (legacy) {
    legacy.unlocked.push({
      achievementId: def.id,
      unlockedAt: new Date(),
      pointsAwarded: def.points,
    });
    legacy.totalPoints = (legacy.totalPoints ?? 0) + def.points;
    await legacy.save();
  } else {
    await UserAchievementProgressModel.create({
      userId: oid,
      unlocked: [
        { achievementId: def.id, unlockedAt: new Date(), pointsAwarded: def.points },
      ],
      counters: { respectGiven: 0, briefsRead: 0, hotTakeSwipes: 0 },
      totalPoints: def.points,
      catalogVersion: 1,
    });
  }

  return toUnlockDto(def, snapshot);
}

export type EvaluateAchievementsOptions = {
  events?: AchievementEvent[];
  sourceEvent?: string;
  skipNotifications?: boolean;
};

async function migrateLegacyUnlocks(userId: string): Promise<void> {
  try {
    const oid = new mongoose.Types.ObjectId(userId);
    const existing = await AchievementUnlockModel.countDocuments({ userId: oid });
    if (existing > 0) return;

    const legacy = await UserAchievementProgressModel.findOne({ userId: oid }).lean();
    if (!legacy?.unlocked?.length) return;

    for (const row of legacy.unlocked) {
      try {
        await AchievementUnlockModel.create({
          userId: oid,
          achievementId: row.achievementId,
          pointsAwarded: row.pointsAwarded,
          xpAwarded: row.pointsAwarded,
          unlockedAt: row.unlockedAt,
        });
      } catch {
        /* duplicate */
      }
    }

    const stats = await getOrCreateUserStats(userId);
    if (legacy.totalPoints != null && (stats.totalAchievementPoints ?? 0) < legacy.totalPoints) {
      stats.totalAchievementPoints = legacy.totalPoints;
      stats.xp = legacy.totalPoints;
      stats.level = levelFromXp(stats.xp);
      await stats.save();
    }
  } catch (e) {
    console.warn('[achievements] legacy unlock migration failed:', userId, String(e));
  }
}

/** Core evaluation — UserStats snapshot, metric index, idempotent unlocks. */
export async function evaluateAchievementsForUser(
  userId: string,
  options: EvaluateAchievementsOptions = {}
): Promise<AchievementUnlockDto[]> {
  if (!userId || !mongoose.isValidObjectId(userId)) return [];

  await migrateLegacyUnlocks(userId);

  const { catalog, version, metricIndex } = await getCachedAchievementCatalog();
  const stats = await getOrCreateUserStats(userId);
  if (stats.catalogVersion !== version) {
    stats.catalogVersion = version;
    await stats.save();
  }

  const snapshot = userStatsToMetricSnapshot(stats);
  const unlockedRows = await AchievementUnlockModel.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .select('achievementId unlockedAt')
    .lean();
  const unlockedIds = new Set(unlockedRows.map((r) => r.achievementId));
  const unlockedMap = new Map(
    unlockedRows.map((r) => [r.achievementId, r.unlockedAt] as const)
  );

  const affected = options.events ? metricsAffectedByEvents(options.events) : null;
  const toEvaluate = filterCatalogByMetrics(catalog, affected, metricIndex);

  const newlyUnlocked: AchievementUnlockDto[] = [];

  for (const def of toEvaluate) {
    if (unlockedIds.has(def.id)) continue;
    if (!isUnlocked(def, snapshot, unlockedIds)) continue;

    const dto = await recordUnlock(userId, def, snapshot, options.sourceEvent);
    if (!dto) continue;
    unlockedIds.add(def.id);
    unlockedMap.set(def.id, new Date());
    newlyUnlocked.push(dto);
  }

  await persistProgressRows(userId, catalog, snapshot, unlockedIds);

  if (newlyUnlocked.length > 0) {
    void publishAchievementUnlockRealtime(userId, newlyUnlocked);
    if (!options.skipNotifications) {
      void notifyAchievementUnlocks(userId, newlyUnlocked);
    }
  }

  return newlyUnlocked;
}

export async function processAchievementEvents(
  userId: string,
  events: AchievementEvent[],
  ctx?: { sourceEvent?: string; skipNotifications?: boolean }
): Promise<AchievementUnlockDto[]> {
  if (!userId || !mongoose.isValidObjectId(userId) || events.length === 0) return [];

  await applyAchievementEventsToUserStats(userId, events);

  const needsEval =
    events.some((e) => e.type === 'profile_sync') ||
    events.some((e) => e.type === 'respect_given' || e.type === 'brief_read' || e.type === 'cv_parsed');

  if (!needsEval) return [];

  return evaluateAchievementsForUser(userId, {
    events,
    sourceEvent: ctx?.sourceEvent,
    skipNotifications: ctx?.skipNotifications,
  });
}

export async function getAchievementsForUser(userId: string): Promise<{
  catalogVersion: number;
  total: number;
  unlockedCount: number;
  totalPoints: number;
  xp: number;
  level: number;
  items: AchievementProgressItemDto[];
}> {
  const { catalog, byId, total, version } = await getCachedAchievementCatalog();
  await migrateLegacyUnlocks(userId);
  const stats = await getOrCreateUserStats(userId);
  const snapshot = userStatsToMetricSnapshot(stats);

  const unlockedRows = await AchievementUnlockModel.find({
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();
  const unlockedMap = new Map(
    unlockedRows.map((r) => [r.achievementId, r.unlockedAt] as const)
  );
  const unlockedIds = new Set(unlockedMap.keys());

  const items: AchievementProgressItemDto[] = catalog.map((def) => {
    const unlockedAt = unlockedMap.get(def.id);
    const current = metricValue(def.metric, snapshot);
    const locked = Boolean(def.unlocksAfter && !unlockedIds.has(def.unlocksAfter));
    return {
      id: def.id,
      slug: def.slug,
      title: def.title,
      description: def.description,
      category: def.category,
      points: def.points,
      metric: def.metric,
      target: def.target,
      current: Math.min(current, def.target),
      unlocked: Boolean(unlockedAt),
      unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
      celebrateAs: def.celebrateAs,
      locked,
    };
  }).sort((a, b) => {
    const ao = byId.get(a.id)?.sortOrder ?? 0;
    const bo = byId.get(b.id)?.sortOrder ?? 0;
    return ao - bo;
  });

  return {
    catalogVersion: version,
    total,
    unlockedCount: unlockedRows.length,
    totalPoints: stats.totalAchievementPoints ?? 0,
    xp: stats.xp ?? 0,
    level: stats.level ?? 1,
    items,
  };
}

export async function getAchievementSummary(userId: string): Promise<{
  unlockedCount: number;
  total: number;
  totalPoints: number;
  xp: number;
  level: number;
}> {
  const { total } = await getCachedAchievementCatalog();
  const stats = await getOrCreateUserStats(userId);
  const unlockedCount = await AchievementUnlockModel.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
  });
  return {
    unlockedCount,
    total,
    totalPoints: stats.totalAchievementPoints ?? 0,
    xp: stats.xp ?? 0,
    level: stats.level ?? 1,
  };
}

export function attachAchievementsToResponse(
  resBody: Record<string, unknown>,
  newlyUnlocked: AchievementUnlockDto[]
): Record<string, unknown> {
  if (newlyUnlocked.length === 0) return resBody;
  return {
    ...resBody,
    achievements: { newlyUnlocked },
  };
}
