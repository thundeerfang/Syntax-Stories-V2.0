import { Request, Response } from 'express';
import { UserModel } from '../models/User.js';
import {
  listProfileRepostedFeedItems,
  listProfileRepliedFeedItems,
} from '../services/profileActivityFeed.service.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseLimit(raw: unknown, fallback = 24): number {
  const n = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) ? Math.min(50, Math.max(1, n)) : fallback;
}

async function resolveActiveUserId(usernameParam: string) {
  const user = await UserModel.findOne({
    username: new RegExp(`^${escapeRegex(usernameParam.trim())}$`, 'i'),
    isActive: true,
  })
    .select('_id')
    .lean();
  return user?._id ?? null;
}

/** GET /api/blog/u/:username/reposts — public: posts this user reposted. */
export async function listUserRepostedPosts(req: Request, res: Response): Promise<void> {
  try {
    const usernameParam = typeof req.params.username === 'string' ? req.params.username : '';
    if (!usernameParam.trim()) {
      res.status(400).json({ success: false, message: 'Invalid username' });
      return;
    }
    const userId = await resolveActiveUserId(usernameParam);
    if (!userId) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const limit = parseLimit(req.query.limit);
    const posts = await listProfileRepostedFeedItems(req, userId, limit);
    res.status(200).json({ success: true, posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load reposts' });
  }
}

/** GET /api/blog/u/:username/replies — public: posts this user commented on. */
export async function listUserRepliedPosts(req: Request, res: Response): Promise<void> {
  try {
    const usernameParam = typeof req.params.username === 'string' ? req.params.username : '';
    if (!usernameParam.trim()) {
      res.status(400).json({ success: false, message: 'Invalid username' });
      return;
    }
    const userId = await resolveActiveUserId(usernameParam);
    if (!userId) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const limit = parseLimit(req.query.limit);
    const posts = await listProfileRepliedFeedItems(req, userId, limit);
    res.status(200).json({ success: true, posts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load replies' });
  }
}
