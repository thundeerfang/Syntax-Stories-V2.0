import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { UserModel } from '../models/User.js';
import { ProfileViewEventModel, ProfileDailyMetricsModel, AnalyticsEventModel } from '../models/index.js';
import type { AuthUser } from '../middlewares/auth/index.js';
import { getRedis } from '../config/redis.js';
import { writeAuditLog } from '../shared/audit/auditLog.js';
import { AuditAction } from '../shared/audit/events.js';
import { redisKeys } from '../shared/redis/keys.js';

const BOT_UA_SUBSTRINGS = ['googlebot', 'bingbot', 'curl', 'wget', 'headlesschrome'] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const CACHE_TTL_SEC = 60;

type LeanUserWithId = { _id: unknown };

function getDayBucket(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function leanIdToObjectId(doc: LeanUserWithId): mongoose.Types.ObjectId {
  const id = doc._id;
  if (id instanceof mongoose.Types.ObjectId) {
    return id;
  }
  return new mongoose.Types.ObjectId(String(id));
}

function isLikelyBot(req: Request): boolean {
  const uaLower = (req.get('User-Agent') ?? '').toLowerCase();
  return BOT_UA_SUBSTRINGS.some((b) => uaLower.includes(b));
}

async function findActiveProfileUserId(username: string): Promise<mongoose.Types.ObjectId | null> {
  const profileUser = await UserModel.findOne({ username: username.trim().toLowerCase(), isActive: true })
    .select('_id')
    .lean<LeanUserWithId | null>();

  if (!profileUser?._id) {
    return null;
  }
  return leanIdToObjectId(profileUser);
}

function isSelfView(viewer: AuthUser | undefined, profileUserId: mongoose.Types.ObjectId): boolean {
  return Boolean(viewer?._id && String(viewer._id) === String(profileUserId));
}

function resolveAnonKey(req: Request, res: Response): string {
  const cookieKey = 'ss_anon';
  const incoming = req.cookies?.[cookieKey];
  if (typeof incoming === 'string' && incoming.length > 0) {
    return incoming;
  }
  const anonKey = new mongoose.Types.ObjectId().toHexString();
  res.cookie(cookieKey, anonKey, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 365 * MS_PER_DAY,
  });
  return anonKey;
}

function computeVisitorId(viewerIdStr: string, anonKey: string | undefined, ip: string, ua: string): string {
  const baseId = viewerIdStr || anonKey || 'anon';
  return crypto.createHash('sha256').update(`${baseId}|${ip}|${ua}`).digest('hex');
}

type DailyInc = Partial<Record<keyof typeof ProfileDailyMetricsModel.schema.obj, number>>;

function buildViewCountIncrement(viewerIdStr: string, hadPreviousView: boolean): DailyInc {
  const inc: DailyInc = {
    totalViews: 1,
    uniqueVisitors: 1,
  };
  if (viewerIdStr) {
    inc.loggedInVisitors = 1;
  } else {
    inc.anonymousVisitors = 1;
  }
  if (hadPreviousView) {
    inc.returningVisitors = 1;
  }
  return inc;
}

async function insertProfileViewOrDuplicate(params: {
  profileUserId: mongoose.Types.ObjectId;
  viewerIdStr: string;
  anonKey: string | undefined;
  visitorId: string;
  dayBucket: string;
  now: Date;
}): Promise<'inserted' | 'duplicate'> {
  try {
    await ProfileViewEventModel.create({
      profileUserId: params.profileUserId,
      viewerUserId: params.viewerIdStr ? new mongoose.Types.ObjectId(params.viewerIdStr) : undefined,
      anonKey: params.anonKey,
      visitorId: params.visitorId,
      dayBucket: params.dayBucket,
      createdAt: params.now,
      source: 'u_page',
    });
    return 'inserted';
  } catch (e) {
    const err = e as { code?: number };
    if (err.code === 11000) {
      return 'duplicate';
    }
    throw e;
  }
}

function scheduleProfileViewSideEffects(params: {
  profileUserId: mongoose.Types.ObjectId;
  viewerIdStr: string;
  visitorId: string;
  now: Date;
}): void {
  void AnalyticsEventModel.create({
    type: 'profile_view',
    actorId: params.viewerIdStr ? new mongoose.Types.ObjectId(params.viewerIdStr) : undefined,
    targetType: 'profile',
    targetId: params.profileUserId,
    visitorId: params.visitorId,
    metadata: {},
    timestamp: params.now,
  }).catch(() => {});
}

async function persistDailyMetrics(
  profileUserId: mongoose.Types.ObjectId,
  dayBucket: string,
  now: Date,
  inc: DailyInc
): Promise<void> {
  await ProfileDailyMetricsModel.findOneAndUpdate(
    { profileUserId, date: dayBucket },
    {
      $inc: inc,
      $set: { lastUpdatedAt: now },
    },
    { upsert: true, new: true }
  );
}

export async function recordProfileView(req: Request, res: Response): Promise<void> {
  try {
    const { username } = req.params as { username?: string };
    const viewer = (req as Request & { user?: AuthUser }).user;

    if (isLikelyBot(req)) {
      res.status(200).json({ success: true, counted: false });
      return;
    }
    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }

    const profileUserId = await findActiveProfileUserId(username);
    if (!profileUserId) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (isSelfView(viewer, profileUserId)) {
      res.status(200).json({ success: true, counted: false });
      return;
    }

    const now = new Date();
    const dayBucket = getDayBucket(now);
    const viewerIdStr = viewer?._id ? String(viewer._id) : '';
    const anonKey = viewerIdStr ? undefined : resolveAnonKey(req, res);
    const ip = (req.ip ?? '').trim();
    const ua = (req.get('User-Agent') ?? '').trim();
    const visitorId = computeVisitorId(viewerIdStr, anonKey, ip, ua);

    const priorExists = await ProfileViewEventModel.exists({
      profileUserId,
      visitorId,
      dayBucket: { $lt: dayBucket },
    });
    const hadPreviousView = priorExists != null;

    const outcome = await insertProfileViewOrDuplicate({
      profileUserId,
      viewerIdStr,
      anonKey,
      visitorId,
      dayBucket,
      now,
    });
    if (outcome === 'duplicate') {
      res.status(200).json({ success: true, counted: false });
      return;
    }

    const inc = buildViewCountIncrement(viewerIdStr, hadPreviousView);
    scheduleProfileViewSideEffects({ profileUserId, viewerIdStr, visitorId, now });

    void writeAuditLog(req, AuditAction.PROFILE_VIEW, {
      actorId: viewerIdStr || undefined,
      targetType: 'profile',
      targetId: String(profileUserId),
      metadata: { visitorId: visitorId.slice(0, 16) },
    });

    await persistDailyMetrics(profileUserId, dayBucket, now, inc);
    res.status(200).json({ success: true, counted: true });
  } catch (err) {
    console.error('recordProfileView error', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

type OverviewMetrics = {
  viewsToday: number;
  views7Days: number;
  views30Days: number;
  uniqueVisitors7Days: number;
  repeatVisitors7Days: number;
  totalViews: number;
};

function aggregateOverviewMetrics(
  metricsDocs: Array<{
    date?: string;
    totalViews?: number;
    uniqueVisitors?: number;
    returningVisitors?: number;
  }>,
  todayBucket: string,
  from7Bucket: string,
  from30Bucket: string
): OverviewMetrics {
  let viewsToday = 0;
  let views7Days = 0;
  let views30Days = 0;
  let unique7 = 0;
  let repeat7 = 0;

  for (const m of metricsDocs) {
    const totalViews = Number(m.totalViews) || 0;
    const uniqueVisitors = Number(m.uniqueVisitors) || 0;
    const returningVisitors = Number(m.returningVisitors) || 0;
    const date = m.date ?? '';
    if (date === todayBucket) {
      viewsToday += totalViews;
    }
    if (date >= from7Bucket) {
      views7Days += totalViews;
      unique7 += uniqueVisitors;
      repeat7 += returningVisitors;
    }
    if (date >= from30Bucket) {
      views30Days += totalViews;
    }
  }

  return {
    viewsToday: viewsToday || 0,
    views7Days: views7Days || 0,
    views30Days: views30Days || 0,
    uniqueVisitors7Days: unique7 || 0,
    repeatVisitors7Days: repeat7 || 0,
    totalViews: views30Days || 0,
  };
}

export async function getProfileOverview(req: Request, res: Response): Promise<void> {
  try {
    const { username } = req.params as { username?: string };
    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }

    const profileUserId = await findActiveProfileUserId(username);
    if (!profileUserId) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const now = new Date();
    const todayBucket = getDayBucket(now);
    const from7Bucket = getDayBucket(new Date(now.getTime() - 7 * MS_PER_DAY));
    const from30Bucket = getDayBucket(new Date(now.getTime() - 30 * MS_PER_DAY));

    const redis = getRedis();
    const cacheKey = redisKeys.analytics.profileOverview(username.trim().toLowerCase());

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const metrics = JSON.parse(cached) as OverviewMetrics;
        res.status(200).json({ success: true, metrics });
        return;
      }
    }

    const metricsDocs = await ProfileDailyMetricsModel.find({
      profileUserId,
      date: { $gte: from30Bucket, $lte: todayBucket },
    })
      .lean()
      .exec();

    const responseMetrics = aggregateOverviewMetrics(metricsDocs, todayBucket, from7Bucket, from30Bucket);

    if (redis) {
      await redis.setEx(cacheKey, CACHE_TTL_SEC, JSON.stringify(responseMetrics));
    }

    res.status(200).json({ success: true, metrics: responseMetrics });
  } catch (err) {
    console.error('getProfileOverview error', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getProfileTimeSeries(req: Request, res: Response): Promise<void> {
  try {
    const { username } = req.params as { username?: string };
    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }

    const profileUserId = await findActiveProfileUserId(username);
    if (!profileUserId) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const now = new Date();
    const todayBucket = getDayBucket(now);
    const from30Bucket = getDayBucket(new Date(now.getTime() - 30 * MS_PER_DAY));

    const redis = getRedis();
    const cacheKey = redisKeys.analytics.profileTimeseries(username.trim().toLowerCase());

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const series = JSON.parse(cached) as Array<{ date: string; views: number }>;
        res.status(200).json({ success: true, series });
        return;
      }
    }

    const docs = await ProfileDailyMetricsModel.find({
      profileUserId,
      date: { $gte: from30Bucket, $lte: todayBucket },
    })
      .sort({ date: 1 })
      .lean()
      .exec();

    const series = docs.map((d) => ({
      date: d.date,
      views: Number(d.totalViews) || 0,
    }));

    if (redis) {
      await redis.setEx(cacheKey, CACHE_TTL_SEC, JSON.stringify(series));
    }

    res.status(200).json({ success: true, series });
  } catch (err) {
    console.error('getProfileTimeSeries error', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
