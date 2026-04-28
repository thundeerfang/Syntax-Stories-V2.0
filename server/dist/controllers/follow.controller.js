import mongoose from 'mongoose';
import { UserModel, normalizeProfileImg } from '../models/User.js';
import { FollowModel } from '../models/Follow.js';
import { getRedis } from '../config/redis.js';
import { AnalyticsEventModel } from '../models/index.js';
import { writeAuditLog } from '../shared/audit/auditLog.js';
import { AuditAction } from '../shared/audit/events.js';
import { redisKeys } from '../shared/redis/keys.js';
import { RateLimitHttpError, isAppHttpError } from '../errors/httpErrors.js';
import { sendAppHttpError } from '../errors/sendAppHttpError.js';
const FOLLOWED_FIELDS = 'username fullName profileImg';
const PUBLIC_PROFILE_FIELDS = 'username fullName profileImg coverBanner bio portfolioUrl linkedin github instagram youtube stackAndTools workExperiences education certifications projects openSourceContributions mySetup createdAt followersCount followingCount';
const DAILY_FOLLOW_LIMIT = 500;
function secondsUntilUtcMidnight() {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
    return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}
function dailyFollowLimitError() {
    return new RateLimitHttpError(`Daily follow limit reached (${DAILY_FOLLOW_LIMIT}/day).`, secondsUntilUtcMidnight(), 'DAILY_FOLLOW_LIMIT', { limit: DAILY_FOLLOW_LIMIT });
}
/** Recompute from Follow collection when denormalized counts are missing, then persist on User. */
async function ensureStoredFollowCounts(userId, followersCount, followingCount) {
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
export async function getPublicProfile(req, res) {
    try {
        const username = req.params.username?.trim()?.toLowerCase();
        if (!username) {
            res.status(400).json({ success: false, message: 'Username required' });
            return;
        }
        const user = await UserModel.findOne({ username, isActive: true }).select(PUBLIC_PROFILE_FIELDS).lean();
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const u = user;
        const counts = await ensureStoredFollowCounts(u._id, u.followersCount, u.followingCount);
        const profileImg = normalizeProfileImg(u.profileImg);
        res.status(200).json({
            success: true,
            user: { ...user, id: String(user._id), profileImg },
            followersCount: counts.followersCount,
            followingCount: counts.followingCount,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
export async function getFollowCounts(req, res) {
    try {
        const username = req.params.username?.trim()?.toLowerCase();
        if (!username) {
            res.status(400).json({ success: false, message: 'Username required' });
            return;
        }
        const user = await UserModel.findOne({ username }).select('_id followersCount followingCount').lean();
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const u = user;
        const counts = await ensureStoredFollowCounts(u._id, u.followersCount, u.followingCount);
        res.status(200).json({ success: true, followersCount: counts.followersCount, followingCount: counts.followingCount });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
function dayBucketUTC(d = new Date()) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function isMongooseTransactionUnsupportedError(e) {
    const msg = e instanceof Error ? e.message : '';
    return (msg.includes('Transaction numbers are only allowed on a replica set member') ||
        msg.includes('replica set') ||
        msg.includes('Transaction') ||
        msg.includes('transaction'));
}
async function enforceFollowDailyCap(redis, currentUserId, dayKey) {
    const capKey = redisKeys.follow.dailyCap(String(currentUserId), dayKey);
    const n = await redis.incr(capKey);
    if (n === 1)
        await redis.expire(capKey, 48 * 60 * 60);
    if (n > DAILY_FOLLOW_LIMIT)
        throw dailyFollowLimitError();
}
async function applyFollowSideEffectsTransaction(session, currentUser, target, dayKey, now) {
    await Promise.all([
        UserModel.updateOne({ _id: target._id }, { $inc: { followersCount: 1 } }, { session }),
        UserModel.updateOne({ _id: currentUser._id }, { $inc: { followingCount: 1 } }, { session }),
    ]);
    await AnalyticsEventModel.create([
        {
            type: 'follow',
            actorId: new mongoose.Types.ObjectId(String(currentUser._id)),
            targetType: 'profile',
            targetId: new mongoose.Types.ObjectId(String(target._id)),
            visitorId: `user:${currentUser._id}`,
            metadata: { day: dayKey },
            timestamp: now,
        },
    ], { session });
}
async function applyFollowSideEffectsFallback(currentUser, target, dayKey, now) {
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
    }).catch(() => { });
}
/**
 * Standalone Mongo (no replica set): upsert follow, enforce cap, bump counts.
 * Returns whether the handler should stop (response already sent) and the `created` flag when continuing.
 */
async function followUserNonTransactionalFallback(res, currentUser, target, redis, dayKey, now) {
    const updateResult = await FollowModel.updateOne({ follower: currentUser._id, following: target._id }, { $setOnInsert: { follower: currentUser._id, following: target._id } }, { upsert: true });
    const created = updateResult.upsertedCount === 1;
    if (!created) {
        res.status(200).json({ success: true, message: 'Already following' });
        return { done: true, created: false };
    }
    if (redis) {
        try {
            await enforceFollowDailyCap(redis, currentUser._id, dayKey);
        }
        catch (e) {
            if (isAppHttpError(e)) {
                await FollowModel.deleteOne({ follower: currentUser._id, following: target._id }).catch(() => { });
                sendAppHttpError(res, e);
                return { done: true, created: false };
            }
            throw e;
        }
    }
    await applyFollowSideEffectsFallback(currentUser, target, dayKey, now);
    return { done: false, created: true };
}
/** Parses limit + optional cursor; sends 400 on bad cursor and returns null. */
function parseFollowListQuery(req, res) {
    const limit = Math.min(Number(req.query?.limit) || DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT);
    const cursorRaw = req.query?.cursor?.trim();
    if (!cursorRaw)
        return { limit };
    const cursor = new Date(cursorRaw);
    if (Number.isNaN(cursor.getTime())) {
        res.status(400).json({ success: false, message: 'Invalid cursor' });
        return null;
    }
    return { limit, cursor };
}
async function paginatedFollowEdges(userId, limit, cursor, mode) {
    const peerKey = mode === 'followers' ? 'follower' : 'following';
    const filterKey = mode === 'followers' ? 'following' : 'follower';
    const filter = { [filterKey]: userId };
    if (cursor)
        filter.createdAt = { $lt: cursor };
    const follows = await FollowModel.find(filter)
        .select(`${peerKey} createdAt`)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate(peerKey, FOLLOWED_FIELDS)
        .lean();
    const hasMore = follows.length > limit;
    const slice = hasMore ? follows.slice(0, limit) : follows;
    const list = slice.map((f) => {
        const u = f[peerKey];
        return {
            id: String(u._id),
            username: u.username,
            fullName: u.fullName,
            profileImg: normalizeProfileImg(u.profileImg),
        };
    });
    const last = slice.at(-1);
    const nextCursor = hasMore && slice.length > 0 && last?.createdAt
        ? last.createdAt.toISOString() ?? null
        : null;
    return { list, nextCursor };
}
export async function getFollowers(req, res) {
    try {
        const username = req.params.username?.trim()?.toLowerCase();
        if (!username) {
            res.status(400).json({ success: false, message: 'Username required' });
            return;
        }
        const parsed = parseFollowListQuery(req, res);
        if (!parsed)
            return;
        const user = await UserModel.findOne({ username }).select('_id').lean();
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const { list, nextCursor } = await paginatedFollowEdges(user._id, parsed.limit, parsed.cursor, 'followers');
        res.status(200).json({ success: true, list, nextCursor });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
export async function getFollowing(req, res) {
    try {
        const username = req.params.username?.trim()?.toLowerCase();
        if (!username) {
            res.status(400).json({ success: false, message: 'Username required' });
            return;
        }
        const parsed = parseFollowListQuery(req, res);
        if (!parsed)
            return;
        const user = await UserModel.findOne({ username }).select('_id').lean();
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const { list, nextCursor } = await paginatedFollowEdges(user._id, parsed.limit, parsed.cursor, 'following');
        res.status(200).json({ success: true, list, nextCursor });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
export async function followUser(req, res) {
    try {
        const currentUser = req.user;
        if (!currentUser?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const username = req.params.username?.trim()?.toLowerCase();
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
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const updateResult = await FollowModel.updateOne({ follower: currentUser._id, following: target._id }, { $setOnInsert: { follower: currentUser._id, following: target._id } }, { upsert: true, session });
                created = updateResult.upsertedCount === 1;
                if (!created)
                    return;
                if (redis)
                    await enforceFollowDailyCap(redis, currentUser._id, dayKey);
                await applyFollowSideEffectsTransaction(session, currentUser, target, dayKey, now);
            });
        }
        catch (e) {
            if (isAppHttpError(e)) {
                sendAppHttpError(res, e);
                return;
            }
            // If transactions aren't supported (standalone Mongo), fallback to non-transactional behavior
            if (!isMongooseTransactionUnsupportedError(e))
                throw e;
            const fb = await followUserNonTransactionalFallback(res, currentUser, target, redis, dayKey, now);
            if (fb.done)
                return;
            created = fb.created;
        }
        finally {
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
export async function unfollowUser(req, res) {
    try {
        const currentUser = req.user;
        if (!currentUser?._id) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        const username = req.params.username?.trim()?.toLowerCase();
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
                const deleteResult = await FollowModel.deleteOne({ follower: currentUser._id, following: target._id }, { session });
                deleted = (deleteResult.deletedCount ?? 0) > 0;
                if (!deleted)
                    return;
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
        }
        catch (e) {
            if (!isMongooseTransactionUnsupportedError(e))
                throw e;
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
                }).catch(() => { });
            }
        }
        finally {
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
const SEARCH_USER_LIMIT = 10;
/** GET /api/follow/search?q=... - search users by username for mentions (public) */
export async function searchUsers(req, res) {
    try {
        const q = req.query?.q?.trim();
        if (!q || q.length < 1) {
            res.status(200).json({ success: true, list: [] });
            return;
        }
        const RE_ESCAPE = /[.*+?^${}()|[\]\\]/g;
        const safe = q.replaceAll(RE_ESCAPE, (c) => `\\${c}`);
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
/** GET /api/follow/check/:username - returns { following: boolean } for current user */
export async function checkFollowing(req, res) {
    try {
        const currentUser = req.user;
        const username = req.params.username?.trim()?.toLowerCase();
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}
//# sourceMappingURL=follow.controller.js.map