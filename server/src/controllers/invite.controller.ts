import type { Request, Response } from "express";
import mongoose from "mongoose";
import { getFrontendRedirectBase } from "../config/frontendUrl.js";
import type { AuthUser } from "../middlewares/auth/verifyToken.js";
import { UserModel, normalizeProfileImg } from "../models/User.js";
import { ReferralShareEventModel } from "../models/ReferralShareEvent.js";
import {
  normalizeReferralCode,
  resolveCodeForDisplay,
  ensureReferralCodeForUser,
} from "../services/referral.service.js";
import { listReferralConversions } from "../services/referral/referralConversion.service.js";
import {
  getReferralUserStatsCached,
  getReferralLeaderboardTop,
} from "../services/referral/referralStatsCache.service.js";
import { emitAppEvent } from "../shared/events/appEvents.js";
const SHARE_CHANNELS = new Set([
  "copy_link",
  "copy_code",
  "twitter",
  "whatsapp",
  "email",
  "other",
]);
export async function getInviteResolve(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
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
    res.status(500).json({ valid: false as const, message: "Internal error" });
  }
}
export async function getInviteMe(req: Request, res: Response): Promise<void> {
  try {
    const user = (
      req as Request & {
        user?: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const code = await ensureReferralCodeForUser(String(user._id));
    const fe = (getFrontendRedirectBase() || "").replace(/\/$/, "");
    const invitePath = `/invite/${encodeURIComponent(code)}`;
    const inviteUrl = fe ? `${fe}${invitePath}` : invitePath;
    res.status(200).json({
      success: true,
      referralCode: code,
      inviteUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load invite" });
  }
}
export async function getInviteStats(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user?: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
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
    res.status(500).json({ success: false, message: "Failed to load stats" });
  }
}
export async function getInviteReferred(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user?: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const rawLimit = Number(req.query.limit);
    const rawSkip = Number(req.query.skip);
    const limit = Math.min(
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 25,
      100,
    );
    const skip = Math.min(
      Number.isFinite(rawSkip) && rawSkip >= 0 ? Math.floor(rawSkip) : 0,
      50000,
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
    res
      .status(500)
      .json({ success: false, message: "Failed to load referrals" });
  }
}
export async function getInviteLeaderboard(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Math.min(
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 20,
      100,
    );
    const rows = await getReferralLeaderboardTop(limit);
    const userIds = rows
      .map((r) => r.userId)
      .filter((id) => mongoose.isValidObjectId(id));
    const users = await UserModel.find({ _id: { $in: userIds } })
      .select("username fullName profileImg")
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
          profileImg: u?.profileImg
            ? normalizeProfileImg(u.profileImg as string)
            : null,
        };
      }),
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load leaderboard" });
  }
}
export async function postInviteShare(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const user = (
      req as Request & {
        user?: AuthUser;
      }
    ).user;
    if (!user?._id) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const channelRaw =
      typeof req.body?.channel === "string" ? req.body.channel.trim() : "";
    const channel = SHARE_CHANNELS.has(channelRaw) ? channelRaw : "other";
    const referralCode =
      typeof req.body?.referralCode === "string"
        ? (normalizeReferralCode(req.body.referralCode) ?? undefined)
        : undefined;
    await ReferralShareEventModel.create({
      userId: user._id,
      channel,
      referralCode,
    });
    emitAppEvent("referral.share", {
      userId: String(user._id),
      channel,
      referralCode,
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to record share" });
  }
}
