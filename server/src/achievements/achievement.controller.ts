import { Request, Response } from "express";
import type { AuthUser } from "../middlewares/auth/index.js";
import {
  getAchievementsForUser,
  getAchievementSummary,
} from "../services/achievements/achievementEngine.service.js";
import {
  getLeaderboardTop,
  getLeaderboardRank,
} from "../services/achievements/leaderboard.service.js";
function authUserId(req: Request): string | null {
  const user = (
    req as Request & {
      user?: AuthUser;
    }
  ).user;
  return user?._id ? String(user._id) : null;
}
export async function getAchievements(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = authUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const data = await getAchievementsForUser(userId);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load achievements" });
  }
}
export async function getAchievementsSummary(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = authUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const summary = await getAchievementSummary(userId);
    res.status(200).json({ success: true, ...summary });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load achievement summary" });
  }
}
export async function getAchievementsLeaderboard(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = authUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const [top, me] = await Promise.all([
      getLeaderboardTop(limit),
      getLeaderboardRank(userId),
    ]);
    res.status(200).json({ success: true, top, me });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load leaderboard" });
  }
}
