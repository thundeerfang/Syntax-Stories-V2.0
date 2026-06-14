import mongoose from "mongoose";
import { Request, Response } from "express";
import {
  attachAchievementsToResponse,
  dispatchAchievementEvents,
} from "../achievements/achievement.service.js";
import { BlogCategoryFollowModel } from "../models/BlogCategoryFollow.js";
import { UserModel, normalizeProfileImg } from "../models/User.js";
import type { AuthUser } from "../middlewares/auth/index.js";
function paramString(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}
function normalizeCategorySlug(raw: string | undefined): string | null {
  const slug = raw?.trim().toLowerCase() ?? "";
  if (!slug || slug.length > 64) return null;
  return slug;
}
function parseSlugsQuery(raw: unknown): string[] {
  const parts: string[] = [];
  if (typeof raw === "string") {
    parts.push(...raw.split(","));
  } else if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") parts.push(...item.split(","));
    }
  }
  return [
    ...new Set(parts.map((s) => s.trim().toLowerCase()).filter(Boolean)),
  ].slice(0, 32);
}
type MemberPreview = {
  username: string;
  profileImg: string;
};
export async function getCategoryMembersPreview(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const slugs = parseSlugsQuery(req.query.slugs);
    if (slugs.length === 0) {
      res.status(200).json({ success: true, categories: {} });
      return;
    }
    const grouped = await BlogCategoryFollowModel.aggregate<{
      _id: string;
      count: number;
      userIds: mongoose.Types.ObjectId[];
    }>([
      { $match: { categorySlug: { $in: slugs } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$categorySlug",
          count: { $sum: 1 },
          userIds: { $push: "$userId" },
        },
      },
      {
        $project: {
          count: 1,
          userIds: { $slice: ["$userIds", 4] },
        },
      },
    ]);
    const previewUserIds = [
      ...new Set(
        grouped
          .flatMap((g) => g.userIds.map((id) => String(id)))
          .filter(Boolean),
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));
    const users =
      previewUserIds.length > 0
        ? await UserModel.find({ _id: { $in: previewUserIds }, isActive: true })
            .select("username profileImg")
            .lean()
        : [];
    const userById = new Map(
      users
        .map((u) => {
          const row = u as {
            _id: mongoose.Types.ObjectId;
            username?: string;
            profileImg?: string;
          };
          const username =
            typeof row.username === "string" ? row.username.trim() : "";
          if (!username) return null;
          return [
            String(row._id),
            {
              username,
              profileImg: normalizeProfileImg(row.profileImg),
            } satisfies MemberPreview,
          ] as const;
        })
        .filter((x): x is [string, MemberPreview] => x != null),
    );
    const categories: Record<
      string,
      {
        totalCount: number;
        members: MemberPreview[];
      }
    > = {};
    for (const slug of slugs) {
      categories[slug] = { totalCount: 0, members: [] };
    }
    for (const row of grouped) {
      const slug = String(row._id).toLowerCase();
      const members = row.userIds
        .map((id) => userById.get(String(id)))
        .filter((m): m is MemberPreview => m != null);
      categories[slug] = {
        totalCount: row.count,
        members,
      };
    }
    res.status(200).json({ success: true, categories });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load category members" });
  }
}
export async function listMyFollowedCategories(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const rows = await BlogCategoryFollowModel.find({
      userId: new mongoose.Types.ObjectId(user._id),
    })
      .sort({ createdAt: -1 })
      .select("categorySlug")
      .lean();
    const slugs = rows
      .map((r) =>
        typeof r.categorySlug === "string"
          ? r.categorySlug.trim().toLowerCase()
          : "",
      )
      .filter(Boolean);
    res.status(200).json({ success: true, slugs });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load followed categories" });
  }
}
export async function syncMyFollowedCategories(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const body = req.body as {
      slugs?: unknown;
    };
    const slugs = Array.isArray(body.slugs)
      ? [
          ...new Set(
            body.slugs
              .filter((x): x is string => typeof x === "string")
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean),
          ),
        ]
      : [];
    if (slugs.length === 0) {
      res.status(200).json({ success: true, synced: 0 });
      return;
    }
    const userId = new mongoose.Types.ObjectId(user._id);
    const ops = slugs.map((categorySlug) => ({
      updateOne: {
        filter: { userId, categorySlug },
        update: { $setOnInsert: { userId, categorySlug } },
        upsert: true,
      },
    }));
    const result = await BlogCategoryFollowModel.bulkWrite(ops, {
      ordered: false,
    });
    res.status(200).json({
      success: true,
      synced: (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0),
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to sync followed categories" });
  }
}
export async function followCategory(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const slug = normalizeCategorySlug(paramString(req.params.slug));
    if (!slug) {
      res.status(400).json({ success: false, message: "Invalid category" });
      return;
    }
    const userId = new mongoose.Types.ObjectId(user._id);
    const result = await BlogCategoryFollowModel.updateOne(
      { userId, categorySlug: slug },
      { $setOnInsert: { userId, categorySlug: slug } },
      { upsert: true },
    );
    const newlyUnlocked =
      result.upsertedCount === 1
        ? await dispatchAchievementEvents(String(user._id), [
            { type: "profile_sync" },
          ])
        : [];
    res
      .status(200)
      .json(
        attachAchievementsToResponse(
          { success: true, following: true, slug },
          newlyUnlocked,
        ),
      );
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to follow category" });
  }
}
export async function unfollowCategory(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const slug = normalizeCategorySlug(paramString(req.params.slug));
    if (!slug) {
      res.status(400).json({ success: false, message: "Invalid category" });
      return;
    }
    await BlogCategoryFollowModel.deleteOne({
      userId: new mongoose.Types.ObjectId(user._id),
      categorySlug: slug,
    });
    res.status(200).json({ success: true, following: false, slug });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to unfollow category" });
  }
}
