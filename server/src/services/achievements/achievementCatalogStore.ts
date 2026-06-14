import {
  ACHIEVEMENT_CATALOG,
  RETIRED_ACHIEVEMENT_KEYS,
} from "../../achievements/achievement.catalog.js";
import { invalidateAchievementCatalogCache } from "./achievementCatalogCache.js";
import type { AchievementDef } from "../../achievements/achievement.types.js";
import { AchievementCatalogModel } from "../../models/AchievementCatalog.js";
type CatalogRow = {
  _id: {
    toString(): string;
  };
  key: string;
  slug: string;
  title: string;
  description: string;
  category: AchievementDef["category"];
  module: AchievementDef["module"];
  points: number;
  metric: AchievementDef["metric"];
  target: number;
  unlocksAfter?: string | null;
  celebrateAs: AchievementDef["celebrateAs"];
  sortOrder: number;
  active: boolean;
  updatedAt?: Date;
};
function mapDef(row: CatalogRow): AchievementDef {
  return {
    id: row.key,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    module: row.module,
    points: row.points,
    metric: row.metric,
    target: row.target,
    unlocksAfter: row.unlocksAfter ?? undefined,
    celebrateAs: row.celebrateAs,
    sortOrder: row.sortOrder,
  };
}
export function mapAdminAchievement(row: CatalogRow) {
  return {
    id: String(row._id),
    key: row.key,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    module: row.module,
    points: row.points,
    metric: row.metric,
    target: row.target,
    unlocksAfter: row.unlocksAfter ?? null,
    celebrateAs: row.celebrateAs,
    sortOrder: row.sortOrder,
    active: row.active,
  };
}
export async function ensureDefaultAchievements(): Promise<void> {
  for (const def of ACHIEVEMENT_CATALOG) {
    await AchievementCatalogModel.updateOne(
      { key: def.id },
      {
        $set: {
          slug: def.slug,
          title: def.title,
          description: def.description,
          category: def.category,
          module: def.module,
          points: def.points,
          metric: def.metric,
          target: def.target,
          unlocksAfter: def.unlocksAfter ?? null,
          celebrateAs: def.celebrateAs,
          sortOrder: def.sortOrder,
          active: true,
        },
        $setOnInsert: { key: def.id },
      },
      { upsert: true },
    );
  }
  if (RETIRED_ACHIEVEMENT_KEYS.length > 0) {
    await AchievementCatalogModel.updateMany(
      { key: { $in: [...RETIRED_ACHIEVEMENT_KEYS] } },
      { $set: { active: false } },
    );
  }
}
async function loadRows(activeOnly: boolean) {
  await ensureDefaultAchievements();
  const filter = activeOnly ? { active: true } : {};
  return AchievementCatalogModel.find(filter)
    .sort({ sortOrder: 1, key: 1 })
    .lean();
}
export async function getAchievementCatalogVersion(): Promise<number> {
  await ensureDefaultAchievements();
  const agg = await AchievementCatalogModel.aggregate([
    { $match: { active: true } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        maxUpdated: { $max: "$updatedAt" },
      },
    },
  ]);
  if (!agg[0]) return 1;
  const maxUpdated = agg[0].maxUpdated
    ? new Date(agg[0].maxUpdated).getTime()
    : 0;
  return agg[0].count * 1000000 + (maxUpdated % 1000000);
}
export async function loadActiveAchievementCatalog(): Promise<{
  catalog: AchievementDef[];
  byId: Map<string, AchievementDef>;
  total: number;
  version: number;
}> {
  const rows = await loadRows(true);
  const catalog = rows.map((r) => mapDef(r as CatalogRow));
  const byId = new Map(catalog.map((a) => [a.id, a]));
  const version = await getAchievementCatalogVersion();
  return { catalog, byId, total: catalog.length, version };
}
export async function listAchievementsAdminFromStore() {
  const rows = await loadRows(false);
  return rows.map((r) => mapAdminAchievement(r as CatalogRow));
}
export async function createAchievementInStore(input: {
  key: string;
  slug: string;
  title: string;
  description: string;
  category: AchievementDef["category"];
  module: AchievementDef["module"];
  points: number;
  metric: AchievementDef["metric"];
  target: number;
  unlocksAfter?: string | null;
  sortOrder: number;
  active: boolean;
}) {
  const exists = await AchievementCatalogModel.findOne({
    key: input.key,
  }).lean();
  if (exists) {
    throw new AchievementCatalogStoreError(
      409,
      "Achievement key already exists",
      "CONFLICT",
    );
  }
  const slugTaken = await AchievementCatalogModel.findOne({
    slug: input.slug,
  }).lean();
  if (slugTaken) {
    throw new AchievementCatalogStoreError(
      409,
      "Achievement slug already exists",
      "CONFLICT",
    );
  }
  if (input.unlocksAfter) {
    const prereq = await AchievementCatalogModel.findOne({
      key: input.unlocksAfter,
      active: true,
    }).lean();
    if (!prereq) {
      throw new AchievementCatalogStoreError(
        400,
        "unlocksAfter must reference an active achievement key",
        "VALIDATION_ERROR",
      );
    }
  }
  const doc = await AchievementCatalogModel.create({
    key: input.key,
    slug: input.slug,
    title: input.title,
    description: input.description,
    category: input.category,
    module: input.module,
    points: input.points,
    metric: input.metric,
    target: input.target,
    unlocksAfter: input.unlocksAfter ?? null,
    celebrateAs: "dialog",
    sortOrder: input.sortOrder,
    active: input.active,
  });
  void invalidateAchievementCatalogCache();
  return mapAdminAchievement(doc.toObject() as CatalogRow);
}
export async function updateAchievementInStore(
  id: string,
  patch: Partial<{
    slug: string;
    title: string;
    description: string;
    category: AchievementDef["category"];
    module: AchievementDef["module"];
    points: number;
    metric: AchievementDef["metric"];
    target: number;
    unlocksAfter: string | null;
    sortOrder: number;
    active: boolean;
  }>,
) {
  const doc = await AchievementCatalogModel.findById(id);
  if (!doc)
    throw new AchievementCatalogStoreError(
      404,
      "Achievement not found",
      "NOT_FOUND",
    );
  if (patch.slug !== undefined) {
    const slugTaken = await AchievementCatalogModel.findOne({
      slug: patch.slug,
      _id: { $ne: doc._id },
    }).lean();
    if (slugTaken) {
      throw new AchievementCatalogStoreError(
        409,
        "Achievement slug already exists",
        "CONFLICT",
      );
    }
    doc.slug = patch.slug;
  }
  if (patch.title !== undefined) doc.title = patch.title;
  if (patch.description !== undefined) doc.description = patch.description;
  if (patch.category !== undefined) doc.category = patch.category;
  if (patch.module !== undefined) doc.module = patch.module;
  if (patch.points !== undefined) doc.points = patch.points;
  if (patch.metric !== undefined) doc.metric = patch.metric;
  if (patch.target !== undefined) doc.target = patch.target;
  if (patch.sortOrder !== undefined) doc.sortOrder = patch.sortOrder;
  if (patch.active !== undefined) doc.active = patch.active;
  if (patch.unlocksAfter !== undefined) {
    if (patch.unlocksAfter) {
      if (patch.unlocksAfter === doc.key) {
        throw new AchievementCatalogStoreError(
          400,
          "Achievement cannot unlock after itself",
          "VALIDATION_ERROR",
        );
      }
      const prereq = await AchievementCatalogModel.findOne({
        key: patch.unlocksAfter,
        active: true,
      }).lean();
      if (!prereq) {
        throw new AchievementCatalogStoreError(
          400,
          "unlocksAfter must reference an active achievement key",
          "VALIDATION_ERROR",
        );
      }
    }
    doc.unlocksAfter = patch.unlocksAfter;
  }
  await doc.save();
  void invalidateAchievementCatalogCache();
  return mapAdminAchievement(doc.toObject() as CatalogRow);
}
export async function deleteAchievementFromStore(id: string) {
  const doc = await AchievementCatalogModel.findById(id);
  if (!doc)
    throw new AchievementCatalogStoreError(
      404,
      "Achievement not found",
      "NOT_FOUND",
    );
  doc.active = false;
  await doc.save();
  void invalidateAchievementCatalogCache();
  return { id, deactivated: true };
}
export class AchievementCatalogStoreError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "VALIDATION_ERROR",
  ) {
    super(message);
    this.name = "AchievementCatalogStoreError";
  }
}
