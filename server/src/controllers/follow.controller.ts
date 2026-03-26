import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { UserModel, normalizeProfileImg } from '../models/User';
import { FollowModel } from '../models/Follow';
import type { AuthUser } from '../middlewares/auth';
import { getRedis } from '../config/redis';
import { AnalyticsEventModel } from '../models';
import { writeAuditLog } from '../shared/audit/auditLog';
import { AuditAction } from '../shared/audit/events';
import { redisKeys } from '../shared/redis/keys';

const FOLLOWED_FIELDS = 'username fullName profileImg';
const PUBLIC_PROFILE_FIELDS = 'username fullName profileImg coverBanner bio portfolioUrl linkedin github instagram youtube stackAndTools workExperiences education certifications projects openSourceContributions mySetup createdAt followersCount followingCount';

const DAILY_FOLLOW_LIMIT = 500;

/** Recompute from Follow collection when denormalized counts are missing, then persist on User. */
async function ensureStoredFollowCounts(
  userId: mongoose.Types.ObjectId,
  followersCount: number | null | undefined,
  followingCount: number | null | undefined
): Promise<{ followersCount: number; followingCount: number }> {
  if (followersCount != null && followingCount != null) {
    return { followersCount, followingCount };
  }
  const [fc, fic] = await Promise.all([
    FollowModel.countDocuments({ following: userId }),
    FollowModel.countDocuments({ follower: userId }),
  ]);
  await UserModel.updateOne({ _id: userId }, { $set: { followersCount: fc, followingCount: fic } });
  return { followersCount: fc, followingCount: fic };
}

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
    const u = user as { _id: mongoose.Types.ObjectId; profileImg?: string; followersCount?: number; followingCount?: number };
    const counts = await ensureStoredFollowCounts(u._id, u.followersCount, u.followingCount);
    const profileImg = normalizeProfileImg(u.profileImg);
    res.status(200).json({
      success: true,
      user: { ...user, id: String(user._id), profileImg },
      followersCount: counts.followersCount,
      followingCount: counts.followingCount,
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
    const u = user as { _id: mongoose.Types.ObjectId; followersCount?: number; followingCount?: number };
    const counts = await ensureStoredFollowCounts(u._id, u.followersCount, u.followingCount);
    res.status(200).json({ success: true, followersCount: counts.followersCount, followingCount: counts.followingCount });
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

function isMongooseTransactionUnsupportedError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : '';
  return (
    msg.includes('Transaction numbers are only allowed on a replica set member') ||
    msg.includes('replica set') ||
    msg.includes('Transaction') ||
    msg.includes('transaction')
  );
}

/** Parses limit + optional cursor; sends 400 on bad cursor and returns null. */
function parseFollowListQuery(req: Request, res: Response): { limit: number; cursor?: Date } | null {
  const limit = Math.min(Number(req.query?.limit) || DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
  const cursorRaw = (req.query?.cursor as string)?.trim();
  if (!cursorRaw) return { limit };
  const cursor = new Date(cursorRaw);
  if (isNaN(cursor.getTime())) {
    res.status(400).json({ success: false, message: 'Invalid cursor' });
    return null;
  }
  return { limit, cursor };
}

type FollowListItem = { id: string; username: string; fullName: string; profileImg: string | undefined };

async function paginatedFollowEdges(
  userId: mongoose.Types.ObjectId,
  limit: number,
  cursor: Date | undefined,
  mode: 'followers' | 'following'
): Promise<{ list: FollowListItem[]; nextCursor: string | null }> {
  const peerKey = mode === 'followers' ? 'follower' : 'following';
  const filterKey = mode === 'followers' ? 'following' : 'follower';
  const filter: Record<string, unknown> = { [filterKey]: userId };
  if (cursor) filter.createdAt = { $lt: cursor };

  const follows = await FollowModel.find(filter as mongoose.FilterQuery<{ createdAt: Date }>)
    .select(`${peerKey} createdAt`)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate(peerKey, FOLLOWED_FIELDS)
    .lean();

  const hasMore = follows.length > limit;
  const slice = hasMore ? follows.slice(0, limit) : follows;
  const list = slice.map((f) => {
    const u = (f as Record<string, unknown>)[peerKey] as {
      _id: mongoose.Types.ObjectId;
      username: string;
      fullName: string;
      profileImg?: string;
    };
    return {
      id: String(u._id),
      username: u.username,
      fullName: u.fullName,
      profileImg: normalizeProfileImg(u.profileImg),
    };
  });
  const nextCursor =
    hasMore && slice.length > 0
      ? (slice[slice.length - 1] as { createdAt: Date }).createdAt?.toISOString() ?? null
      : null;
  return { list, nextCursor };
}

export async function getFollowers(req: Request, res: Response): Promise<void> {
  try {
    const username = (req.params as { username?: string }).username?.trim()?.toLowerCase();
    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }
    const parsed = parseFollowListQuery(req, res);
    if (!parsed) return;
    const user = await UserModel.findOne({ username }).select('_id').lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const { list, nextCursor } = await paginatedFollowEdges(user._id, parsed.limit, parsed.cursor, 'followers');
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
    const parsed = parseFollowListQuery(req, res);
    if (!parsed) return;
    const user = await UserModel.findOne({ username }).select('_id').lean();
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const { list, nextCursor } = await paginatedFollowEdges(user._id, parsed.limit, parsed.cursor, 'following');
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
          const capKey = redisKeys.follow.dailyCap(String(currentUser._id), dayKey);
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
      if (!isMongooseTransactionUnsupportedError(e)) throw e;

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
        const capKey = redisKeys.follow.dailyCap(String(currentUser._id), dayKey);
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

    void writeAuditLog(req, AuditAction.FOLLOW, {
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
      if (!isMongooseTransactionUnsupportedError(e)) throw e;

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
      void writeAuditLog(req, AuditAction.UNFOLLOW, {
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
