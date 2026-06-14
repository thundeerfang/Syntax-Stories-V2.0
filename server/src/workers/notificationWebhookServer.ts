import express from "express";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import {
  NOTIFICATION_ICONS,
  NOTIFICATION_TYPES,
  type NotificationIcon,
  type NotificationType,
} from "../services/notifications/notification.types.js";
import { createNotification } from "../services/notifications/notification.service.js";
import { getActivePlatformWebhook } from "../services/notifications/platformNotificationConfig.service.js";
const NOTIFICATION_TYPE_SET = new Set<string>(NOTIFICATION_TYPES);
const NOTIFICATION_ICON_SET = new Set<string>(NOTIFICATION_ICONS);
function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === "string" && NOTIFICATION_TYPE_SET.has(value);
}
function parseNotificationIcon(value: unknown): NotificationIcon | undefined {
  if (typeof value === "string" && NOTIFICATION_ICON_SET.has(value)) {
    return value as NotificationIcon;
  }
  return undefined;
}
function ingestSecretMatches(header: string | undefined): boolean {
  const configured = env.NOTIFICATION_WEBHOOK_INGEST_SECRET?.trim();
  if (!configured || !header) return false;
  return header === configured;
}
async function platformSecretMatches(
  header: string | undefined,
): Promise<boolean> {
  if (!header) return false;
  const wh = await getActivePlatformWebhook();
  const secret = wh?.secret?.trim();
  return Boolean(secret && header === secret);
}
export function startNotificationWebhookServer(): void {
  const app = express();
  app.use(express.json({ limit: "32kb" }));
  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "notification-webhook",
      ts: new Date().toISOString(),
    });
  });
  app.get("/webhooks/notifications/ping", (_req, res) => {
    res.json({ ok: true, service: "notification-webhook" });
  });
  app.post("/webhooks/notifications/ingest", async (req, res) => {
    const secret =
      typeof req.headers["x-webhook-secret"] === "string"
        ? req.headers["x-webhook-secret"]
        : undefined;
    const allowed =
      ingestSecretMatches(secret) || (await platformSecretMatches(secret));
    if (!allowed) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const body = req.body as {
      userId?: unknown;
      type?: unknown;
      title?: unknown;
      message?: unknown;
      href?: unknown;
      icon?: unknown;
      metadata?: unknown;
    };
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res
        .status(400)
        .json({ success: false, message: "Valid userId is required" });
      return;
    }
    if (!isNotificationType(body.type)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid notification type" });
      return;
    }
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const href = typeof body.href === "string" ? body.href.trim() : "";
    if (!title || !message || !href) {
      res
        .status(400)
        .json({
          success: false,
          message: "title, message, and href are required",
        });
      return;
    }
    const item = await createNotification({
      userId,
      type: body.type,
      title,
      message,
      href,
      icon: parseNotificationIcon(body.icon),
      metadata:
        body.metadata &&
        typeof body.metadata === "object" &&
        !Array.isArray(body.metadata)
          ? (body.metadata as Record<string, unknown>)
          : undefined,
    });
    if (!item) {
      res.status(200).json({
        success: true,
        skipped: true,
        message: "Notification skipped by user preferences",
      });
      return;
    }
    res.status(201).json({ success: true, notification: item });
  });
  app.listen(env.NOTIFICATION_WEBHOOK_PORT, () => {
    console.log(
      `[NotificationWebhook] HTTP listening on port ${env.NOTIFICATION_WEBHOOK_PORT}`,
    );
  });
}
