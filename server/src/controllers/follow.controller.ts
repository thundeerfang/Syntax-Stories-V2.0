import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { UserModel, normalizeProfileImg } from '../models/User';
import { FollowModel } from '../models/Follow';
import type { AuthUser } from '../middlewares/auth';
import { getRedis } from '../config/redis';
import { AnalyticsEventModel } from '../models';
import { writeAuditLog } from '../utils/auditLog';

const FOLLOWED_FIELDS = 'username fullName profileImg';
const PUBLIC_PROFILE_FIELDS = 'username fullName profileImg coverBanner bio portfolioUrl linkedin github instagram youtube stackAndTools workExperiences education certifications projects openSourceContributions mySetup createdAt followersCount followingCount';

const DAILY_FOLLOW_LIMIT = 500;

export async function getPublicProfile(req: Request, res: Response): Promise<void> {
  try {
    const username = (req.params as { username?: string }).username?.trim()?.toLowerCase();
    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }
    const user = await UserModel.findOne({ username, isActive: true }).select(PUBLIC_PROFILE_FIELDS).lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    let followersCount = (user as { followersCount?: number }).followersCount;
    let followingCount = (user as { followingCount?: number }).followingCount;
    if (followersCount == null || followingCount == null) {
      const [fc, fic] = await Promise.all([
        FollowModel.countDocuments({ following: user._id }),
        FollowModel.countDocuments({ follower: user._id }),
      ]);
      followersCount = fc;
      followingCount = fic;
      await UserModel.updateOne({ _id: user._id }, { $set: { followersCount: fc, followingCount: fic } });
    }
    const profileImg = normalizeProfileImg((user as { profileImg?: string }).profileImg);
    res.status(200).json({
      success: true,
      user: { ...user, id: String(user._id), profileImg },
      followersCount: followersCount ?? 0,
      followingCount: followingCount ?? 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getFollowCounts(req: Request, res: Response): Promise<void> {
  try {
    const username = (req.params as { username?: string }).username?.trim()?.toLowerCase();
    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }
    const user = await UserModel.findOne({ username }).select('_id followersCount followingCount').lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    let followersCount = (user as { followersCount?: number }).followersCount;
    let followingCount = (user as { followingCount?: number }).followingCount;
    if (followersCount == null || followingCount == null) {
      const [fc, fic] = await Promise.all([
        FollowModel.countDocuments({ following: user._id }),
        FollowModel.countDocuments({ follower: user._id }),
      ]);
      followersCount = fc;
      followingCount = fic;
      await UserModel.updateOne({ _id: user._id }, { $set: { followersCount: fc, followingCount: fic } });
    }
    res.status(200).json({ success: true, followersCount: followersCount ?? 0, followingCount: followingCount ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;

function dayBucketUTC(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getFollowers(req: Request, res: Response): Promise<void> {
  try {
    const username = (req.params as { username?: string }).username?.trim()?.toLowerCase();
    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }
    const limit = Math.min(Number(req.query?.limit) || DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const cursorRaw = (req.query?.cursor as string)?.trim();
    let cursor: Date | undefined;
    if (cursorRaw) {
      cursor = new Date(cursorRaw);
      if (isNaN(cursor.getTime())) {
        res.status(400).json({ success: false, message: 'Invalid cursor' });
        return;
      }
    }
    const user = await UserModel.findOne({ username }).select('_id').lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const filter: mongoose.FilterQuery<{ following: unknown; createdAt: Date }> = { following: user._id };
    if (cursor) filter.createdAt = { $lt: cursor };
    const follows = await FollowModel.find(filter)
      .select('follower createdAt')
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate<{ follower: { _id: string; username: string; fullName: string; profileImg?: string } }>('follower', FOLLOWED_FIELDS)
      .lean();
    const hasMore = follows.length > limit;
    const slice = hasMore ? follows.slice(0, limit) : follows;
    const list = slice.map((f) => {
      const u = f.follower as unknown as { _id: mongoose.Types.ObjectId; username: string; fullName: string; profileImg?: string };
      return { id: String(u._id), username: u.username, fullName: u.fullName, profileImg: normalizeProfileImg(u.profileImg) };
    });
    const nextCursor = hasMore && slice.length > 0
      ? (slice[slice.length - 1] as { createdAt: Date }).createdAt?.toISOString() ?? null
      : null;
    res.status(200).json({ success: true, list, nextCursor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getFollowing(req: Request, res: Response): Promise<void> {
  try {
    const username = (req.params as { username?: string }).username?.trim()?.toLowerCase();
    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }
    const limit = Math.min(Number(req.query?.limit) || DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const cursorRaw = (req.query?.cursor as string)?.trim();
    let cursor: Date | undefined;
    if (cursorRaw) {
      cursor = new Date(cursorRaw);
      if (isNaN(cursor.getTime())) {
        res.status(400).json({ success: false, message: 'Invalid cursor' });
        return;
      }
    }
    const user = await UserModel.findOne({ username }).select('_id').lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const filter: mongoose.FilterQuery<{ follower: unknown; createdAt: Date }> = { follower: user._id };
    if (cursor) filter.createdAt = { $lt: cursor };
    const follows = await FollowModel.find(filter)
      .select('following createdAt')
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate<{ following: { _id: string; username: string; fullName: string; profileImg?: string } }>('following', FOLLOWED_FIELDS)
      .lean();
    const hasMore = follows.length > limit;
    const slice = hasMore ? follows.slice(0, limit) : follows;
    const list = slice.map((f) => {
      const u = f.following as unknown as { _id: mongoose.Types.ObjectId; username: string; fullName: string; profileImg?: string };
      return { id: String(u._id), username: u.username, fullName: u.fullName, profileImg: normalizeProfileImg(u.profileImg) };
    });
    const nextCursor = hasMore && slice.length > 0
      ? (slice[slice.length - 1] as { createdAt: Date }).createdAt?.toISOString() ?? null
      : null;
    res.status(200).json({ success: true, list, nextCursor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function followUser(req: Request, res: Response): Promise<void> {
  try {
    const currentUser = (req as Request & { user?: AuthUser }).user;
    if (!currentUser?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const username = (req.params as { username?: string }).username?.trim()?.toLowerCase();
    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }
    const target = await UserModel.findOne({ username }).select('_id').lean();
    if (!target) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (String(target._id) === currentUser._id) {
      res.status(400).json({ success: false, message: 'Cannot follow yourself' });
      return;
    }
    const startedAt = Date.now();
    const now = new Date();
    const redis = getRedis();
    const dayKey = dayBucketUTC(now);

    let created = false;
    let dailyAllowed = true;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const updateResult = await FollowModel.updateOne(
          { follower: currentUser._id, following: target._id },
          { $setOnInsert: { follower: currentUser._id, following: target._id } },
          { upsert: true, session }
        );
        created = updateResult.upsertedCount === 1;
        if (!created) return;

        // Daily follow cap (counts only NEW follows)
        if (redis) {
          const capKey = `cap:follow:${currentUser._id}:${dayKey}`;
          const n = await redis.incr(capKey);
          if (n === 1) await redis.expire(capKey, 48 * 60 * 60);
          if (n > DAILY_FOLLOW_LIMIT) {
            dailyAllowed = false;
            // Roll back by throwing; transaction will abort
            throw new Error('DAILY_FOLLOW_LIMIT');
          }
        }

        await Promise.all([
          UserModel.updateOne({ _id: target._id }, { $inc: { followersCount: 1 } }, { session }),
          UserModel.updateOne({ _id: currentUser._id }, { $inc: { followingCount: 1 } }, { session }),
        ]);

        // Audit event (best effort inside txn)
        await AnalyticsEventModel.create([{
          type: 'follow',
          actorId: new mongoose.Types.ObjectId(String(currentUser._id)),
          targetType: 'profile',
          targetId: new mongoose.Types.ObjectId(String(target._id)),
          visitorId: `user:${currentUser._id}`,
          metadata: { day: dayKey },
          timestamp: now,
        }], { session });
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'DAILY_FOLLOW_LIMIT') {
        res.status(429).json({ success: false, message: `Daily follow limit reached (${DAILY_FOLLOW_LIMIT}/day).` });
        return;
      }
      // If transactions aren't supported (standalone Mongo), fallback to non-transactional behavior
      const msg = e instanceof Error ? e.message : '';
      const looksLikeTxnUnsupported =
        msg.includes('Transaction numbers are only allowed on a replica set member') ||
        msg.includes('replica set') ||
        msg.includes('Transaction') ||
        msg.includes('transaction');

      if (!looksLikeTxnUnsupported) throw e;

      const updateResult = await FollowModel.updateOne(
        { follower: currentUser._id, following: target._id },
        { $setOnInsert: { follower: currentUser._id, following: target._id } },
        { upsert: true }
      );
      created = updateResult.upsertedCount === 1;
      if (!created) {
        res.status(200).json({ success: true, message: 'Already following' });
        return;
      }

      if (redis) {
        const capKey = `cap:follow:${currentUser._id}:${dayKey}`;
        const n = await redis.incr(capKey);
        if (n === 1) await redis.expire(capKey, 48 * 60 * 60);
        if (n > DAILY_FOLLOW_LIMIT) {
          await FollowModel.deleteOne({ follower: currentUser._id, following: target._id }).catch(() => {});
          res.status(429).json({ success: false, message: `Daily follow limit reached (${DAILY_FOLLOW_LIMIT}/day).` });
          return;
        }
      }

      await Promise.all([
        UserModel.updateOne({ _id: target._id }, { $inc: { followersCount: 1 } }),
        UserModel.updateOne({ _id: currentUser._id }, { $inc: { followingCount: 1 } }),
      ]);
      void AnalyticsEventModel.create({
        type: 'follow',
        actorId: new mongoose.Types.ObjectId(String(currentUser._id)),
        targetType: 'profile',
        targetId: new mongoose.Types.ObjectId(String(target._id)),
        visitorId: `user:${currentUser._id}`,
        metadata: { day: dayKey, txn: 'fallback' },
        timestamp: now,
      }).catch(() => {});
    } finally {
      session.endSession();
    }

    if (!created) {
      res.status(200).json({ success: true, message: 'Already following' });
      return;
    }

    void writeAuditLog(req, 'follow', {
      actorId: String(currentUser._id),
      targetType: 'user',
      targetId: String(target._id),
      metadata: {},
    });
    res.status(201).json({ success: true, message: 'Following' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function unfollowUser(req: Request, res: Response): Promise<void> {
  try {
    const currentUser = (req as Request & { user?: AuthUser }).user;
    if (!currentUser?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const username = (req.params as { username?: string }).username?.trim()?.toLowerCase();
    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }
    const target = await UserModel.findOne({ username }).select('_id').lean();
    if (!target) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const startedAt = Date.now();
    const now = new Date();
    const dayKey = dayBucketUTC(now);

    let deleted = false;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const deleteResult = await FollowModel.deleteOne(
          { follower: currentUser._id, following: target._id },
          { session }
        );
        deleted = (deleteResult.deletedCount ?? 0) > 0;
        if (!deleted) return;

        await Promise.all([
          UserModel.updateOne({ _id: target._id }, { $inc: { followersCount: -1 } }, { session }),
          UserModel.updateOne({ _id: currentUser._id }, { $inc: { followingCount: -1 } }, { session }),
        ]);

        await AnalyticsEventModel.create([{
          type: 'unfollow',
          actorId: new mongoose.Types.ObjectId(String(currentUser._id)),
          targetType: 'profile',
          targetId: new mongoose.Types.ObjectId(String(target._id)),
          visitorId: `user:${currentUser._id}`,
          metadata: { day: dayKey },
          timestamp: now,
        }], { session });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      const looksLikeTxnUnsupported =
        msg.includes('Transaction numbers are only allowed on a replica set member') ||
        msg.includes('replica set') ||
        msg.includes('Transaction') ||
        msg.includes('transaction');

      if (!looksLikeTxnUnsupported) throw e;

      const deleteResult = await FollowModel.deleteOne({ follower: currentUser._id, following: target._id });
      deleted = (deleteResult.deletedCount ?? 0) > 0;
      if (deleted) {
        await Promise.all([
          UserModel.updateOne({ _id: target._id }, { $inc: { followersCount: -1 } }),
          UserModel.updateOne({ _id: currentUser._id }, { $inc: { followingCount: -1 } }),
        ]);
        void AnalyticsEventModel.create({
          type: 'unfollow',
          actorId: new mongoose.Types.ObjectId(String(currentUser._id)),
          targetType: 'profile',
          targetId: new mongoose.Types.ObjectId(String(target._id)),
          visitorId: `user:${currentUser._id}`,
          metadata: { day: dayKey, txn: 'fallback' },
          timestamp: now,
        }).catch(() => {});
      }
    } finally {
      session.endSession();
    }

    if (deleted) {
      void writeAuditLog(req, 'unfollow', {
        actorId: String(currentUser._id),
        targetType: 'user',
        targetId: String(target._id),
        metadata: {},
      });
    }
    res.status(200).json({ success: true, message: 'Unfollowed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

const SEARCH_USER_LIMIT = 10;

/** GET /api/follow/search?q=... - search users by username for mentions (public) */
export async function searchUsers(req: Request, res: Response): Promise<void> {
  try {
    const q = (req.query?.q as string)?.trim();
    if (!q || q.length < 1) {
      res.status(200).json({ success: true, list: [] });
      return;
    }
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(safe, 'i');
    const users = await UserModel.find({
      isActive: true,
      $or: [{ username: regex }, { fullName: regex }],
    })
      .select(FOLLOWED_FIELDS)
      .limit(SEARCH_USER_LIMIT)
      .lean();
    const list = users.map((u) => ({
      id: String(u._id),
      username: u.username,
      fullName: u.fullName,
      profileImg: normalizeProfileImg(u.profileImg),
    }));
    res.status(200).json({ success: true, list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/** GET /api/follow/check/:username - returns { following: boolean } for current user */
export async function checkFollowing(req: Request, res: Response): Promise<void> {
  try {
    const currentUser = (req as Request & { user?: AuthUser }).user;
    const username = (req.params as { username?: string }).username?.trim()?.toLowerCase();
    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }
    if (!currentUser?._id) {
      res.status(200).json({ success: true, following: false });
      return;
    }
    const target = await UserModel.findOne({ username }).select('_id').lean();
    if (!target) {
      res.status(200).json({ success: true, following: false });
      return;
    }
    const exists = await FollowModel.exists({ follower: currentUser._id, following: target._id });
    res.status(200).json({ success: true, following: !!exists });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
