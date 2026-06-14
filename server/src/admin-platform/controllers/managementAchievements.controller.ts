import type { Request, Response } from "express";
import mongoose from "mongoose";
import type {
  AchievementCategory,
  AchievementMetric,
  AchievementModule,
} from "../../achievements/achievement.types.js";
import {
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_METRICS,
  ACHIEVEMENT_MODULES,
} from "../../achievements/achievement.types.js";
import {
  sendAdminError,
  sendAdminOk,
  type AdminErrorCode,
} from "../rbac/adminResponse.js";
import {
  AchievementCatalogStoreError,
  createAchievementInStore,
  deleteAchievementFromStore,
  listAchievementsAdminFromStore,
  updateAchievementInStore,
} from "../../services/achievements/achievementCatalogStore.js";
function parseCategory(raw: unknown): AchievementCategory | null {
  return typeof raw === "string" &&
    ACHIEVEMENT_CATEGORIES.includes(raw as AchievementCategory)
    ? (raw as AchievementCategory)
    : null;
}
function parseModule(raw: unknown): AchievementModule | null {
  return typeof raw === "string" &&
    ACHIEVEMENT_MODULES.includes(raw as AchievementModule)
    ? (raw as AchievementModule)
    : null;
}
function parseMetric(raw: unknown): AchievementMetric | null {
  return typeof raw === "string" &&
    ACHIEVEMENT_METRICS.includes(raw as AchievementMetric)
    ? (raw as AchievementMetric)
    : null;
}
function parseKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim();
  if (!key || key.length > 64) return null;
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(key)) return null;
  return key;
}
function parseSlug(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const slug = raw.trim();
  if (!slug || slug.length > 64) return null;
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) return null;
  return slug;
}
export async function listAchievementsAdmin(
  _req: Request,
  res: Response,
): Promise<void> {
  const items = await listAchievementsAdminFromStore();
  sendAdminOk(res, { items, configuredCount: items.length });
}
export async function postAchievement(
  req: Request,
  res: Response,
): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const key = parseKey(body.key);
  const slug = parseSlug(body.slug);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const category = parseCategory(body.category);
  const module = parseModule(body.module);
  const metric = parseMetric(body.metric);
  if (!key) {
    sendAdminError(
      res,
      400,
      "VALIDATION_ERROR",
      "key is required (alphanumeric and hyphens, max 64)",
    );
    return;
  }
  if (!slug) {
    sendAdminError(
      res,
      400,
      "VALIDATION_ERROR",
      "slug is required (alphanumeric and hyphens, max 64)",
    );
    return;
  }
  if (!title || title.length > 120) {
    sendAdminError(
      res,
      400,
      "VALIDATION_ERROR",
      "title is required (max 120 characters)",
    );
    return;
  }
  if (!description || description.length > 280) {
    sendAdminError(
      res,
      400,
      "VALIDATION_ERROR",
      "description is required (max 280 characters)",
    );
    return;
  }
  if (!category) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "category is invalid");
    return;
  }
  if (!module) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "module is invalid");
    return;
  }
  if (!metric) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "metric is invalid");
    return;
  }
  const points =
    typeof body.points === "number" && Number.isFinite(body.points)
      ? Math.max(0, Math.min(10000, Math.floor(body.points)))
      : null;
  if (points === null) {
    sendAdminError(
      res,
      400,
      "VALIDATION_ERROR",
      "points must be a number between 0 and 10000",
    );
    return;
  }
  const target =
    typeof body.target === "number" && Number.isFinite(body.target)
      ? Math.max(1, Math.min(1000000, Math.floor(body.target)))
      : null;
  if (target === null) {
    sendAdminError(
      res,
      400,
      "VALIDATION_ERROR",
      "target must be a number >= 1",
    );
    return;
  }
  const sortOrder =
    typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.floor(body.sortOrder)
      : 0;
  const active = body.active === undefined ? true : Boolean(body.active);
  const unlocksAfter =
    body.unlocksAfter === undefined ||
    body.unlocksAfter === null ||
    body.unlocksAfter === ""
      ? null
      : parseKey(body.unlocksAfter);
  if (body.unlocksAfter && !unlocksAfter) {
    sendAdminError(
      res,
      400,
      "VALIDATION_ERROR",
      "unlocksAfter must be a valid achievement key",
    );
    return;
  }
  try {
    const item = await createAchievementInStore({
      key,
      slug,
      title,
      description,
      category,
      module,
      points,
      metric,
      target,
      unlocksAfter,
      sortOrder,
      active,
    });
    sendAdminOk(res, { item });
  } catch (e) {
    if (e instanceof AchievementCatalogStoreError) {
      sendAdminError(res, e.status, e.code as AdminErrorCode, e.message);
      return;
    }
    throw e;
  }
}
export async function patchAchievement(
  req: Request,
  res: Response,
): Promise<void> {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!id || !mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "Invalid achievement id");
    return;
  }
  const body = req.body as Record<string, unknown>;
  const patch: Parameters<typeof updateAchievementInStore>[1] = {};
  if (body.slug !== undefined) {
    const slug = parseSlug(body.slug);
    if (!slug) {
      sendAdminError(
        res,
        400,
        "VALIDATION_ERROR",
        "slug must be 1–64 alphanumeric/hyphen characters",
      );
      return;
    }
    patch.slug = slug;
  }
  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 120) {
      sendAdminError(
        res,
        400,
        "VALIDATION_ERROR",
        "title must be 1–120 characters",
      );
      return;
    }
    patch.title = title;
  }
  if (body.description !== undefined) {
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    if (!description || description.length > 280) {
      sendAdminError(
        res,
        400,
        "VALIDATION_ERROR",
        "description must be 1–280 characters",
      );
      return;
    }
    patch.description = description;
  }
  if (body.category !== undefined) {
    const category = parseCategory(body.category);
    if (!category) {
      sendAdminError(res, 400, "VALIDATION_ERROR", "category is invalid");
      return;
    }
    patch.category = category;
  }
  if (body.module !== undefined) {
    const module = parseModule(body.module);
    if (!module) {
      sendAdminError(res, 400, "VALIDATION_ERROR", "module is invalid");
      return;
    }
    patch.module = module;
  }
  if (body.metric !== undefined) {
    const metric = parseMetric(body.metric);
    if (!metric) {
      sendAdminError(res, 400, "VALIDATION_ERROR", "metric is invalid");
      return;
    }
    patch.metric = metric;
  }
  if (body.points !== undefined) {
    if (typeof body.points !== "number" || !Number.isFinite(body.points)) {
      sendAdminError(res, 400, "VALIDATION_ERROR", "points must be a number");
      return;
    }
    patch.points = Math.max(0, Math.min(10000, Math.floor(body.points)));
  }
  if (body.target !== undefined) {
    if (typeof body.target !== "number" || !Number.isFinite(body.target)) {
      sendAdminError(res, 400, "VALIDATION_ERROR", "target must be a number");
      return;
    }
    patch.target = Math.max(1, Math.min(1000000, Math.floor(body.target)));
  }
  if (body.sortOrder !== undefined) {
    if (
      typeof body.sortOrder !== "number" ||
      !Number.isFinite(body.sortOrder)
    ) {
      sendAdminError(
        res,
        400,
        "VALIDATION_ERROR",
        "sortOrder must be a number",
      );
      return;
    }
    patch.sortOrder = Math.floor(body.sortOrder);
  }
  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (body.unlocksAfter !== undefined) {
    if (body.unlocksAfter === null || body.unlocksAfter === "") {
      patch.unlocksAfter = null;
    } else {
      const unlocksAfter = parseKey(body.unlocksAfter);
      if (!unlocksAfter) {
        sendAdminError(
          res,
          400,
          "VALIDATION_ERROR",
          "unlocksAfter must be a valid achievement key",
        );
        return;
      }
      patch.unlocksAfter = unlocksAfter;
    }
  }
  if (Object.keys(patch).length === 0) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "No fields to update");
    return;
  }
  try {
    const item = await updateAchievementInStore(id, patch);
    sendAdminOk(res, { item });
  } catch (e) {
    if (e instanceof AchievementCatalogStoreError) {
      sendAdminError(res, e.status, e.code as AdminErrorCode, e.message);
      return;
    }
    throw e;
  }
}
export async function deleteAchievement(
  req: Request,
  res: Response,
): Promise<void> {
  const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!id || !mongoose.isValidObjectId(id)) {
    sendAdminError(res, 400, "VALIDATION_ERROR", "Invalid achievement id");
    return;
  }
  try {
    const result = await deleteAchievementFromStore(id);
    sendAdminOk(res, result);
  } catch (e) {
    if (e instanceof AchievementCatalogStoreError) {
      sendAdminError(res, e.status, e.code as AdminErrorCode, e.message);
      return;
    }
    throw e;
  }
}
export async function getAchievementCatalogOptions(
  _req: Request,
  res: Response,
): Promise<void> {
  sendAdminOk(res, {
    categories: [...ACHIEVEMENT_CATEGORIES],
    modules: [...ACHIEVEMENT_MODULES],
    metrics: [...ACHIEVEMENT_METRICS],
  });
}
