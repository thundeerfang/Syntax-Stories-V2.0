import type { Request, Response, NextFunction } from "express";
import { env } from "../../../config/env.js";
import { SessionModel } from "../../../models/Session.js";
import { sendAdminError } from "../adminResponse.js";
import type { StaffManagementRequest } from "./staffManagementContext.js";
import {
  tierMeetsRequired,
  type SessionTier,
} from "../../iam/sessionTier.config.js";
export function requireSessionTier(minTier: SessionTier) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!env.FEATURE_ADMIN_SESSION_TIERS) {
      next();
      return;
    }
    const r = req as StaffManagementRequest;
    const sessionId = r.user?.sessionId;
    if (!sessionId) {
      sendAdminError(
        res,
        403,
        "SESSION_TIER_REQUIRED",
        "Session tier could not be verified.",
      );
      return;
    }
    const session = await SessionModel.findById(sessionId)
      .select("sessionTier")
      .lean();
    const tier =
      (session?.sessionTier as SessionTier | undefined) ?? "standard";
    if (!tierMeetsRequired(tier, minTier)) {
      sendAdminError(
        res,
        403,
        "SESSION_TIER_REQUIRED",
        `This action requires a ${minTier} session.`,
      );
      return;
    }
    next();
  };
}
