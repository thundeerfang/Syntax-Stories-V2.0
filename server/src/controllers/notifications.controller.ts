import type { Request, Response } from "express";
import type { AuthUser } from "../middlewares/auth/index.js";
import {
  countUnreadNotifications,
  getOrCreateNotificationPreferences,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  serializeNotificationPreferences,
  updateNotificationPreferences,
  type NotificationListItem,
} from "../services/notifications/notification.service.js";
export type { NotificationListItem };
export async function listNotifications(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (
    req as Request & {
      user: AuthUser;
    }
  ).user;
  if (!user?._id) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  const limitRaw = req.query.limit;
  const limit =
    typeof limitRaw === "string" && /^\d+$/.test(limitRaw)
      ? Number.parseInt(limitRaw, 10)
      : 50;
  const [notifications, unreadCount] = await Promise.all([
    listNotificationsForUser(user._id, limit),
    countUnreadNotifications(user._id),
  ]);
  res.status(200).json({ success: true, notifications, unreadCount });
}
export async function markAllNotificationsReadHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (
    req as Request & {
      user: AuthUser;
    }
  ).user;
  if (!user?._id) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  const modified = await markAllNotificationsRead(user._id);
  res.status(200).json({ success: true, modified });
}
export async function markNotificationReadHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (
    req as Request & {
      user: AuthUser;
    }
  ).user;
  if (!user?._id) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  const id =
    typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
  if (!id) {
    res.status(400).json({ success: false, message: "Invalid id" });
    return;
  }
  const ok = await markNotificationRead(user._id, id);
  res.status(ok ? 200 : 404).json({ success: ok });
}
export async function getNotificationPreferences(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (
    req as Request & {
      user: AuthUser;
    }
  ).user;
  if (!user?._id) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  const prefs = await getOrCreateNotificationPreferences(user._id);
  res
    .status(200)
    .json({
      success: true,
      preferences: serializeNotificationPreferences(prefs),
    });
}
export async function patchNotificationPreferences(
  req: Request,
  res: Response,
): Promise<void> {
  const user = (
    req as Request & {
      user: AuthUser;
    }
  ).user;
  if (!user?._id) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const boolKeys = [
    "inAppEnabled",
    "milestonesEnabled",
    "followingEnabled",
    "trendingEnabled",
    "settingsEnabled",
    "referralsEnabled",
    "squadsEnabled",
    "categoriesEnabled",
    "tagsEnabled",
    "achievementsEnabled",
  ] as const;
  const patch: Record<string, boolean | string | null> = {};
  for (const k of boolKeys) {
    if (typeof body[k] === "boolean") patch[k] = body[k];
  }
  const prefs = await updateNotificationPreferences(user._id, patch);
  res
    .status(200)
    .json({
      success: true,
      preferences: serializeNotificationPreferences(prefs),
    });
}
