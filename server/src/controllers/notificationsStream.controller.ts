import type { Request, Response } from 'express';
import type { AuthUser } from '../middlewares/auth/index.js';
import { getRedis } from '../config/redis.js';
import { redisKeys } from '../shared/redis/keys.js';
import { countUnreadNotifications, listNotificationsForUser } from '../services/notifications/notification.service.js';

/**
 * GET /api/notifications/stream — SSE realtime notification fan-out via Redis Pub/Sub.
 */
export async function streamNotifications(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: AuthUser }).user;
  if (!user?._id) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as Response & { flushHeaders?: () => void }).flushHeaders === 'function') {
    (res as Response & { flushHeaders: () => void }).flushHeaders();
  }

  const send = (obj: unknown) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  const [recent, unreadCount] = await Promise.all([
    listNotificationsForUser(user._id, 20),
    countUnreadNotifications(user._id),
  ]);
  send({ type: 'snapshot', notifications: recent, unreadCount });

  const redis = getRedis();
  if (!redis) {
    const ping = setInterval(() => {
      res.write(': ping\n\n');
    }, 25_000);
    req.on('close', () => clearInterval(ping));
    return;
  }

  let sub: ReturnType<typeof redis.duplicate> | null = null;
  try {
    sub = redis.duplicate();
    await sub.connect();
  } catch (e) {
    console.warn(JSON.stringify({ event: 'notifications_sse_sub_connect_failed', err: String(e) }));
    const ping = setInterval(() => {
      res.write(': ping\n\n');
    }, 25_000);
    req.on('close', () => clearInterval(ping));
    return;
  }

  const channel = redisKeys.notifications.userChannel(user._id);

  const onMessage = (message: string) => {
    try {
      const parsed = JSON.parse(message) as { notification?: unknown };
      if (parsed?.notification) {
        send({ type: 'notification', payload: parsed });
      } else {
        send({ type: 'raw', payload: parsed });
      }
    } catch {
      send({ type: 'raw', payload: message });
    }
  };

  await sub.subscribe(channel, onMessage);

  const ping = setInterval(() => {
    res.write(': ping\n\n');
  }, 25_000);

  req.on('close', () => {
    clearInterval(ping);
    void (async () => {
      try {
        if (sub) {
          await sub.unsubscribe(channel);
          await sub.quit();
        }
      } catch {
        /* ignore */
      }
    })();
  });
}
