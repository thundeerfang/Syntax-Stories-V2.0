import mongoose from "mongoose";
import {
  NotificationModel,
  type INotification,
} from "../../models/Notification.js";
import { writeNotificationAudit } from "../../shared/audit/auditLog.js";
import { NotificationAuditAction } from "../../shared/audit/domains.js";
import {
  UserNotificationPreferencesModel,
  type IUserNotificationPreferences,
} from "../../models/UserNotificationPreferences.js";
import { getRedis } from "../../config/redis.js";
import { redisKeys } from "../../shared/redis/keys.js";
import type {
  CreateNotificationInput,
  NotificationIcon,
  NotificationPayload,
  NotificationType,
} from "./notification.types.js";
import { enqueueNotificationWebhookDelivery } from "./notificationWebhookOutbox.service.js";
import { sendPushNotificationToUser } from "./pushNotification.service.js";
const DEFAULT_ICON: NotificationIcon = "bell";
function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
export type NotificationListItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  icon: NotificationIcon;
  time: string;
  unread: boolean;
  metadata?: Record<string, unknown>;
};
function mapDoc(doc: INotification): NotificationListItem {
  return {
    id: String(doc._id),
    type: doc.kind,
    title: doc.title,
    message: doc.message,
    href: doc.href,
    icon: (doc.icon as NotificationIcon) || DEFAULT_ICON,
    time: formatRelativeTime(doc.createdAt),
    unread: doc.readAt == null,
    metadata: doc.metadata as Record<string, unknown> | undefined,
  };
}
export async function getOrCreateNotificationPreferences(
  userId: string,
): Promise<IUserNotificationPreferences> {
  const oid = new mongoose.Types.ObjectId(userId);
  let prefs = await UserNotificationPreferencesModel.findOne({ userId: oid });
  if (!prefs) {
    prefs = await UserNotificationPreferencesModel.create({ userId: oid });
  }
  return prefs;
}
function isTypeAllowedByPrefs(
  kind: NotificationType,
  prefs: IUserNotificationPreferences,
): boolean {
  if (!prefs.inAppEnabled) return false;
  switch (kind) {
    case "repost_milestone":
    case "view_milestone":
    case "respect_milestone":
      return prefs.milestonesEnabled;
    case "category_new_post":
      return prefs.categoriesEnabled;
    case "tag_new_post":
      return prefs.tagsEnabled;
    case "squad_new_post":
      return prefs.squadsEnabled;
    case "following_new_post":
      return prefs.followingEnabled;
    case "blog_trending":
    case "post_trending":
      return prefs.trendingEnabled;
    case "referral_accepted":
      return prefs.referralsEnabled;
    case "settings_update":
      return prefs.settingsEnabled;
    case "achievement_unlocked":
      return prefs.achievementsEnabled;
    default:
      return true;
  }
}
export async function publishNotificationRealtime(
  userId: string,
  item: NotificationListItem,
): Promise<void> {
  const payload: NotificationPayload = {
    v: 1,
    type: "user_notification",
    notification: {
      id: item.id,
      kind: item.type,
      type: item.type,
      title: item.title,
      message: item.message,
      href: item.href,
      icon: item.icon,
      time: item.time,
      unread: item.unread,
      metadata: item.metadata,
    },
    ts: Date.now(),
  };
  const redis = getRedis();
  const msg = JSON.stringify(payload);
  if (redis) {
    try {
      await redis.publish(redisKeys.notifications.userChannel(userId), msg);
    } catch (e) {
      console.warn("[notificationPublish]", String(e));
    }
  }
  await writeNotificationAudit(NotificationAuditAction.REALTIME_PUBLISHED, {
    userId,
    notificationId: item.id,
    metadata: { kind: item.type },
  });
}
export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationListItem | null> {
  const prefs = await getOrCreateNotificationPreferences(input.userId);
  if (!isTypeAllowedByPrefs(input.type, prefs)) {
    await writeNotificationAudit(NotificationAuditAction.WEBHOOK_SKIPPED, {
      userId: input.userId,
      metadata: { reason: "prefs_disabled", kind: input.type },
    });
    return null;
  }
  const doc = await NotificationModel.create({
    userId: new mongoose.Types.ObjectId(input.userId),
    kind: input.type,
    title: input.title.trim().slice(0, 200),
    message: input.message.trim().slice(0, 500),
    href: input.href.trim().slice(0, 500),
    icon: input.icon ?? DEFAULT_ICON,
    metadata: input.metadata,
  });
  const item = mapDoc(doc);
  await writeNotificationAudit(NotificationAuditAction.CREATED, {
    userId: input.userId,
    notificationId: item.id,
    metadata: { kind: input.type },
  });
  void publishNotificationRealtime(input.userId, item);
  void (async () => {
    const unread = await countUnreadNotifications(input.userId);
    await sendPushNotificationToUser(input.userId, item, unread);
  })();
  if (!input.skipWebhook) {
    void enqueueNotificationWebhookDelivery(input.userId, item);
  }
  return item;
}
export async function listNotificationsForUser(
  userId: string,
  limit = 50,
): Promise<NotificationListItem[]> {
  const rows = await NotificationModel.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .lean();
  return rows.map((r) => ({
    id: String(r._id),
    type: r.kind as NotificationType,
    title: r.title,
    message: r.message,
    href: r.href,
    icon: (r.icon as NotificationIcon) || DEFAULT_ICON,
    time: formatRelativeTime(r.createdAt ?? new Date()),
    unread: r.readAt == null,
    metadata: r.metadata as Record<string, unknown> | undefined,
  }));
}
export async function countUnreadNotifications(
  userId: string,
): Promise<number> {
  return NotificationModel.countDocuments({
    userId: new mongoose.Types.ObjectId(userId),
    readAt: null,
  });
}
export async function markAllNotificationsRead(
  userId: string,
): Promise<number> {
  const result = await NotificationModel.updateMany(
    { userId: new mongoose.Types.ObjectId(userId), readAt: null },
    { $set: { readAt: new Date() } },
  );
  return result.modifiedCount ?? 0;
}
export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) return false;
  const result = await NotificationModel.updateOne(
    {
      _id: new mongoose.Types.ObjectId(notificationId),
      userId: new mongoose.Types.ObjectId(userId),
      readAt: null,
    },
    { $set: { readAt: new Date() } },
  );
  return (result.modifiedCount ?? 0) > 0;
}
export async function updateNotificationPreferences(
  userId: string,
  patch: Partial<{
    inAppEnabled: boolean;
    milestonesEnabled: boolean;
    followingEnabled: boolean;
    trendingEnabled: boolean;
    settingsEnabled: boolean;
    referralsEnabled: boolean;
    squadsEnabled: boolean;
    categoriesEnabled: boolean;
    tagsEnabled: boolean;
    achievementsEnabled: boolean;
  }>,
): Promise<IUserNotificationPreferences> {
  const prefs = await getOrCreateNotificationPreferences(userId);
  if (typeof patch.inAppEnabled === "boolean")
    prefs.inAppEnabled = patch.inAppEnabled;
  if (typeof patch.milestonesEnabled === "boolean")
    prefs.milestonesEnabled = patch.milestonesEnabled;
  if (typeof patch.followingEnabled === "boolean")
    prefs.followingEnabled = patch.followingEnabled;
  if (typeof patch.trendingEnabled === "boolean")
    prefs.trendingEnabled = patch.trendingEnabled;
  if (typeof patch.settingsEnabled === "boolean")
    prefs.settingsEnabled = patch.settingsEnabled;
  if (typeof patch.referralsEnabled === "boolean")
    prefs.referralsEnabled = patch.referralsEnabled;
  if (typeof patch.squadsEnabled === "boolean")
    prefs.squadsEnabled = patch.squadsEnabled;
  if (typeof patch.categoriesEnabled === "boolean")
    prefs.categoriesEnabled = patch.categoriesEnabled;
  if (typeof patch.tagsEnabled === "boolean")
    prefs.tagsEnabled = patch.tagsEnabled;
  if (typeof patch.achievementsEnabled === "boolean")
    prefs.achievementsEnabled = patch.achievementsEnabled;
  await prefs.save();
  return prefs;
}
export function serializeNotificationPreferences(
  prefs: IUserNotificationPreferences,
) {
  return {
    inAppEnabled: prefs.inAppEnabled,
    milestonesEnabled: prefs.milestonesEnabled,
    followingEnabled: prefs.followingEnabled,
    trendingEnabled: prefs.trendingEnabled,
    settingsEnabled: prefs.settingsEnabled,
    referralsEnabled: prefs.referralsEnabled,
    squadsEnabled: prefs.squadsEnabled,
    categoriesEnabled: prefs.categoriesEnabled,
    tagsEnabled: prefs.tagsEnabled,
    achievementsEnabled: prefs.achievementsEnabled,
  };
}
