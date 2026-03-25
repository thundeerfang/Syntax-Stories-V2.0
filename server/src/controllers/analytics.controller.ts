import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { UserModel } from '../models/User';
import { ProfileViewEventModel, ProfileDailyMetricsModel, AnalyticsEventModel } from '../models';
import type { AuthUser } from '../middlewares/auth';
import { getRedis } from '../config/redis';
import { writeAuditLog } from '../utils/auditLog';

function getDayBucket(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function recordProfileView(req: Request, res: Response): Promise<void> {
  try {
    const { username } = req.params as { username?: string };
    const viewer = (req as Request & { user?: AuthUser }).user;

    const uaLower = (req.get('User-Agent') ?? '').toLowerCase();
    const botPatterns = ['googlebot', 'bingbot', 'curl', 'wget', 'headlesschrome'];
    if (botPatterns.some((b) => uaLower.includes(b))) {
      res.status(200).json({ success: true, counted: false });
      return;
    }

    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }

    const profileUser = await UserModel.findOne({ username: username.trim().toLowerCase(), isActive: true })
      .select('_id')
      .lean();

    if (!profileUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const profileUserId = profileUser._id as mongoose.Types.ObjectId;

    // Do not count self views when logged in
    if (viewer?._id && String(viewer._id) === String(profileUserId)) {
      res.status(200).json({ success: true, counted: false });
      return;
    }

    const now = new Date();
    const dayBucket = getDayBucket(now);

    // Determine identity (logged-in vs anon) and build unified visitorId
    const viewerIdStr = viewer?._id ? String(viewer._id) : '';
    let anonKey: string | undefined;

    if (!viewerIdStr) {
      const cookieKey = 'ss_anon';
      const incoming = req.cookies?.[cookieKey] as string | undefined;
      if (incoming && typeof incoming === 'string') {
        anonKey = incoming;
      } else {
        anonKey = new mongoose.Types.ObjectId().toHexString();
        res.cookie(cookieKey, anonKey, {
          httpOnly: false,
          sameSite: 'lax',
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });
      }
    }

    const ip = (req.ip ?? '').trim();
    const ua = (req.get('User-Agent') ?? '').trim();
    const baseId = viewerIdStr || anonKey || 'anon';
    const visitorId = crypto.createHash('sha256').update(`${baseId}|${ip}|${ua}`).digest('hex');

    const inc: Partial<Record<keyof typeof ProfileDailyMetricsModel.schema.obj, number>> = {};
    let counted = false;

    // Determine if this visitor has viewed this profile on any prior day (for returningVisitors metric)
    const hadPrevious = await ProfileViewEventModel.exists({
      profileUserId,
      visitorId,
      dayBucket: { $lt: dayBucket },
    });

    try {
      await ProfileViewEventModel.create({
        profileUserId,
        viewerUserId: viewerIdStr ? new mongoose.Types.ObjectId(viewerIdStr) : undefined,
        anonKey,
        visitorId,
        dayBucket,
        createdAt: now,
        source: 'u_page',
      });

      counted = true;
      inc.totalViews = 1;
      inc.uniqueVisitors = 1;
      if (viewerIdStr) {
        inc.loggedInVisitors = 1;
      } else {
        inc.anonymousVisitors = 1;
      }
      if (hadPrevious) {
        inc.returningVisitors = 1;
      }

      // Dual-write generic analytics event for future expansion (likes, follows, etc.)
      void AnalyticsEventModel.create({
        type: 'profile_view',
        actorId: viewerIdStr ? new mongoose.Types.ObjectId(viewerIdStr) : undefined,
        targetType: 'profile',
        targetId: profileUserId,
        visitorId,
        metadata: {},
        timestamp: now,
      }).catch(() => {});
      void writeAuditLog(req, 'profile_view', {
        actorId: viewerIdStr || undefined,
        targetType: 'profile',
        targetId: String(profileUserId),
        metadata: { visitorId: visitorId.slice(0, 16) },
      });
    } catch (e) {
      const err = e as { code?: number };
      // Duplicate key on (profileUserId, visitorId, dayBucket, source) => already counted today
      if (err.code === 11000) {
        res.status(200).json({ success: true, counted: false });
        return;
      }
      throw e;
    }

    await ProfileDailyMetricsModel.findOneAndUpdate(
      { profileUserId, date: dayBucket },
      {
        $inc: inc,
        $set: { lastUpdatedAt: now },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, counted: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('recordProfileView error', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getProfileOverview(req: Request, res: Response): Promise<void> {
  try {
    const { username } = req.params as { username?: string };
    if (!username) {
      res.status(400).json({ success: false, message: 'Username required' });
      return;
    }

    const profileUser = await UserModel.findOne({ username: username.trim().toLowerCase(), isActive: true })
      .select('_id')
      .lean();

    if (!profileUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const profileUserId = profileUser._id as mongoose.Types.ObjectId;
    const now = new Date();
    const todayBucket = getDayBucket(now);

    const from7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const from30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const from7Bucket = getDayBucket(from7);
    const from30Bucket = getDayBucket(from30);

    const redis = getRedis();
    const cacheKey = `profile:analytics:${username.trim().toLowerCase()}`;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const metrics = JSON.parse(cached) as {
          viewsToday: number;
          views7Days: number;
          views30Days: number;
          uniqueVisitors7Days: number;
          repeatVisitors7Days: number;
          totalViews: number;
        };
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

    let viewsToday = 0;
    let views7Days = 0;
    let views30Days = 0;
    let unique7 = 0;
    let repeat7 = 0;

    for (const m of metricsDocs) {
      const totalViews = Number(m.totalViews) || 0;
      const uniqueVisitors = Number(m.uniqueVisitors) || 0;
      const returningVisitors = Number(m.returningVisitors) || 0;
      if (m.date === todayBucket) {
        viewsToday += totalViews;
      }
      if (m.date >= from7Bucket) {
        views7Days += totalViews;
        unique7 += uniqueVisitors;
        repeat7 += returningVisitors;
      }
      if (m.date >= from30Bucket) {
        views30Days += totalViews;
      }
    }

    const responseMetrics = {
      viewsToday: viewsToday || 0,
      views7Days: views7Days || 0,
      views30Days: views30Days || 0,
      uniqueVisitors7Days: unique7 || 0,
      repeatVisitors7Days: repeat7 || 0,
      totalViews: views30Days || 0,
    };

    if (redis) {
      await redis.setEx(cacheKey, 60, JSON.stringify(responseMetrics));
    }

    res.status(200).json({
      success: true,
      metrics: responseMetrics,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
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

    const profileUser = await UserModel.findOne({ username: username.trim().toLowerCase(), isActive: true })
      .select('_id')
      .lean();

    if (!profileUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const profileUserId = profileUser._id as mongoose.Types.ObjectId;
    const now = new Date();
    const todayBucket = getDayBucket(now);
    const from30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const from30Bucket = getDayBucket(from30);

    const redis = getRedis();
    const cacheKey = `profile:analytics:${username.trim().toLowerCase()}:timeseries`;

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
      await redis.setEx(cacheKey, 60, JSON.stringify(series));
    }

    res.status(200).json({ success: true, series });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('getProfileTimeSeries error', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

