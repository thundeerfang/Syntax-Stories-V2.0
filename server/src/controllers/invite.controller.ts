import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import {
  getFrontendRedirectBase,
  getProductionAllowedOrigins,
  isOriginAllowed,
} from '../config/frontendUrl.js';
import type { AuthUser } from '../middlewares/auth/verifyToken.js';
import { UserModel, normalizeProfileImg } from '../models/User.js';
import { ReferralShareEventModel } from '../models/ReferralShareEvent.js';
import {
  normalizeReferralCode,
  resolveCodeForDisplay,
  ensureReferralCodeForUser,
  lookupReferrerIdByCode,
  buildSignedReferralCookieValue,
  REFERRAL_COOKIE,
} from '../services/referral.service.js';
import { listReferralConversions } from '../services/referral/referralConversion.service.js';
import { getReferralUserStatsCached, getReferralLeaderboardTop } from '../services/referral/referralStatsCache.service.js';
import { emitAppEvent } from '../shared/events/appEvents.js';

/** Allow same-origin path or full URL matching configured frontend. */
function sanitizeRedirectTarget(raw: unknown): string {
  const defaultPath = '/';
  const base = getFrontendRedirectBase();
  if (typeof raw !== 'string' || !raw.trim()) return defaultPath;
  const t = raw.trim();
  if (t.startsWith('/')) {
    if (t.includes('//')) return defaultPath;
    return t;
  }
  try {
    const u = new URL(t);
    const allowedOrigins =
      env.NODE_ENV === 'production'
        ? getProductionAllowedOrigins()
        : base
          ? [new URL(base).origin]
          : [];
    if (env.NODE_ENV === 'production') {
      if (!isOriginAllowed(u.origin, allowedOrigins)) return defaultPath;
    } else if (base) {
      const b = new URL(base).origin;
      if (u.origin !== b) return defaultPath;
    }
    const path = u.pathname + u.search + u.hash;
    return path || defaultPath;
  } catch {
    return defaultPath;
  }
}

const SHARE_CHANNELS = new Set([
  'copy_link',
  'copy_code',
  'copy_attach',
  'twitter',
  'whatsapp',
  'email',
  'other',
]);

/** GET /api/invites/attach?code=&next= — Set-Cookie signed ss_ref, redirect to frontend. */
export async function attachReferralCookie(req: Request, res: Response): Promise<void> {
  try {
    const nextPath = sanitizeRedirectTarget(req.query.next);
    const base = (getFrontendRedirectBase() || '').replace(/\/$/, '');
    const target = `${base}${nextPath.startsWith('/') ? nextPath : `/${nextPath}`}`;

    const code = normalizeReferralCode(req.query.code);
    if (!code) {
      res.redirect(target);
      return;
    }
    const referrerId = await lookupReferrerIdByCode(code);
    const signed = referrerId ? buildSignedReferralCookieValue(code) : null;
    if (signed) {
      res.cookie(REFERRAL_COOKIE.name, signed, {
        maxAge: REFERRAL_COOKIE.maxMs,
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      if (referrerId) {
        emitAppEvent('referral.attached', {
          referrerId,
          code,
        });
      }
    }
    res.redirect(target);
  } catch (err) {
    console.error(err);
    const fb = (getFrontendRedirectBase() || '/').replace(/\/$/, '') + '/';
    res.redirect(fb);
  }
}

/** GET /api/invites/resolve?code= */
export async function getInviteResolve(req: Request, res: Response): Promise<void> {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const out = await resolveCodeForDisplay(code);
    if (!out.valid) {
      res.status(200).json({ valid: false as const });
      return;
    }
    res.status(200).json({
      valid: true,
      username: out.username,
      fullName: out.fullName,
      profileImg: out.profileImg,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ valid: false as const, message: 'Internal error' });
  }
}

/** GET /api/invites/me */
export async function getInviteMe(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const code = await ensureReferralCodeForUser(String(user._id));
    const fe = (getFrontendRedirectBase() || '').replace(/\/$/, '');
    const be = (env.BACKEND_URL || '').replace(/\/$/, '');
    const invitePath = `/invite/${encodeURIComponent(code)}`;
    const inviteUrl = fe ? `${fe}${invitePath}` : invitePath;
    const attachParams = new URLSearchParams({ code, next: '/' });
    const attachUrl = be
      ? `${be}/api/invites/attach?${attachParams}`
      : `/api/invites/attach?${attachParams}`;

    res.status(200).json({
      success: true,
      referralCode: code,
      inviteUrl,
      attachUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load invite' });
  }
}

/** GET /api/invites/stats */
export async function getInviteStats(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const stats = await getReferralUserStatsCached(String(user._id));
    res.status(200).json({
      success: true,
      converted: stats.converted,
      pending: stats.pending,
      rewarded: stats.rewarded,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
}

/** GET /api/invites/referred?limit=&skip= */
export async function getInviteReferred(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const rawLimit = Number(req.query.limit);
    const rawSkip = Number(req.query.skip);
    const limit = Math.min(
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 25,
      100
    );
    const skip = Math.min(
      Number.isFinite(rawSkip) && rawSkip >= 0 ? Math.floor(rawSkip) : 0,
      50_000
    );

    const { total, items } = await listReferralConversions({
      referrerId: String(user._id),
      limit,
      skip,
    });

    res.status(200).json({
      success: true,
      total,
      skip,
      limit,
      items: items.map((r) => ({
        id: r.id,
        username: r.username,
        fullName: r.fullName,
        profileImg: r.profileImg,
        joinedAt: r.joinedAt,
        isActive: r.isActive,
        status: r.status,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load referrals' });
  }
}

/** GET /api/invites/leaderboard?limit= */
export async function getInviteLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Math.min(
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 20,
      100
    );
    const rows = await getReferralLeaderboardTop(limit);
    const userIds = rows.map((r) => r.userId).filter((id) => mongoose.isValidObjectId(id));
    const users = await UserModel.find({ _id: { $in: userIds } })
      .select('username fullName profileImg')
      .lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));

    res.status(200).json({
      success: true,
      items: rows.map((row) => {
        const u = byId.get(row.userId);
        return {
          rank: row.rank,
          score: row.score,
          userId: row.userId,
          username: u?.username ?? null,
          fullName: u?.fullName ?? u?.username ?? null,
          profileImg: u?.profileImg ? normalizeProfileImg(u.profileImg as string) : null,
        };
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load leaderboard' });
  }
}

/** POST /api/invites/share { channel, referralCode? } */
export async function postInviteShare(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const channelRaw = typeof req.body?.channel === 'string' ? req.body.channel.trim() : '';
    const channel = SHARE_CHANNELS.has(channelRaw) ? channelRaw : 'other';
    const referralCode =
      typeof req.body?.referralCode === 'string'
        ? normalizeReferralCode(req.body.referralCode) ?? undefined
        : undefined;

    await ReferralShareEventModel.create({
      userId: user._id,
      channel,
      referralCode,
    });

    emitAppEvent('referral.share', {
      userId: String(user._id),
      channel,
      referralCode,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to record share' });
  }
}
