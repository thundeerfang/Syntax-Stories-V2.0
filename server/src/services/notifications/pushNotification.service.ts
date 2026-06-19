import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { NotificationListItem } from "./notification.service.js";
import {
  listDevicePushTokensForUser,
  removeInvalidPushTokens,
} from "./devicePushToken.service.js";

type FirebaseMessaging = {
  sendEachForMulticast(message: {
    tokens: string[];
    notification?: { title: string; body: string };
    data?: Record<string, string>;
    apns?: {
      payload: { aps: { sound: string; badge?: number } };
    };
    android?: {
      priority: "high";
      notification?: { icon?: string };
    };
  }): Promise<{
    responses: Array<{ success: boolean; error?: { code?: string } }>;
  }>;
};

let messagingPromise: Promise<FirebaseMessaging | null> | null = null;

async function loadServiceAccountJson(): Promise<string | null> {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (filePath) {
    try {
      return await readFile(resolve(filePath), "utf8");
    } catch (e) {
      console.warn(
        "[pushNotification] Could not read FIREBASE_SERVICE_ACCOUNT_PATH:",
        String(e),
      );
      return null;
    }
  }
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  return inline || null;
}

async function getMessaging(): Promise<FirebaseMessaging | null> {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const raw = await loadServiceAccountJson();
      if (!raw) return null;
      try {
        const [{ cert, getApps, initializeApp }, { getMessaging }] =
          await Promise.all([
            import("firebase-admin/app"),
            import("firebase-admin/messaging"),
          ]);
        const serviceAccount = JSON.parse(raw) as Record<string, unknown>;
        if (!getApps().length) {
          initializeApp({
            credential: cert(serviceAccount),
          });
        }
        return getMessaging();
      } catch (e) {
        console.warn("[pushNotification] Firebase init failed:", String(e));
        return null;
      }
    })();
  }
  return messagingPromise;
}

export async function sendPushNotificationToUser(
  userId: string,
  item: NotificationListItem,
  unreadCount?: number,
): Promise<void> {
  const fcm = await getMessaging();
  if (!fcm) return;

  const tokens = await listDevicePushTokensForUser(userId);
  if (!tokens.length) return;

  try {
    const notificationTitle =
      item.type === "settings_update" ? item.message : item.title;
    const notificationBody =
      item.type === "settings_update" ? item.title : item.message;
    const response = await fcm.sendEachForMulticast({
      tokens,
      notification: {
        title: notificationTitle,
        body: notificationBody,
      },
      data: {
        id: item.id,
        type: item.type,
        href: item.href,
        title: item.title,
        message: item.message,
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            ...(typeof unreadCount === "number" ? { badge: unreadCount } : {}),
          },
        },
      },
      android: {
        priority: "high",
        notification: { icon: "syntax_notification_logo" },
      },
    });

    const invalid: string[] = [];
    for (let i = 0; i < response.responses.length; i++) {
      const res = response.responses[i];
      if (res?.success) continue;
      const code = res?.error?.code ?? "";
      if (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      ) {
        const token = tokens[i];
        if (token) invalid.push(token);
      }
    }
    if (invalid.length) {
      await removeInvalidPushTokens(invalid);
    }
  } catch (e) {
    console.warn("[pushNotification] send failed:", String(e));
  }
}
