import type { Request, Response } from 'express';

export type NotificationListItem = {
  id: string;
  title: string;
  message: string;
  href: string;
  time: string;
  unread: boolean;
};

/**
 * GET /api/notifications — inbox for the signed-in user.
 * Returns an empty list until notification persistence is implemented.
 */
export async function listNotifications(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ success: true, notifications: [] as NotificationListItem[] });
}

/** POST /api/notifications/read-all — mark all as read (no-op until persistence exists). */
export async function markAllNotificationsRead(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ success: true });
}
