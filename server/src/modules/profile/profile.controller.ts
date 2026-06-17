import type { Request, Response } from "express";
import type { AuthUser } from "../../middlewares/auth/index.js";
import { ProfileErrorCode, isProfileUpdateSection } from "./profile.types.js";
import { profileService } from "./profile.service.js";
import { attachAchievementsToResponse } from "../../services/achievements/achievementEngine.service.js";
import { dispatchAchievementEvents } from "../../services/achievements/dispatchAchievementEvents.js";
async function sendProfileSuccess(
  res: Response,
  user: Record<string, unknown>,
  userId?: string,
): Promise<void> {
  const newlyUnlocked =
    userId != null
      ? await dispatchAchievementEvents(userId, [{ type: "profile_sync" }])
      : [];
  res.status(200).json(
    attachAchievementsToResponse(
      {
        success: true,
        data: { user },
      },
      newlyUnlocked,
    ),
  );
}
function sendProfileError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const body: Record<string, unknown> = { success: false, code, message };
  if (details !== undefined) body.details = details;
  res.status(status).json(body);
}
function logProfileWriteTiming(section: string, totalMs: number): void {
  console.log(
    JSON.stringify({ msg: "profile.write.timing", section, totalMs }),
  );
}
export async function me(req: Request, res: Response): Promise<void> {
  try {
    const user = (
      req as Request & {
        user: AuthUser;
      }
    ).user;
    const result = await profileService.getMe(String(user._id));
    if (!result.ok) {
      sendProfileError(
        res,
        result.status,
        result.code ?? ProfileErrorCode.USER_NOT_FOUND,
        result.message,
      );
      return;
    }
    res.status(200).json({ success: true, data: { user: result.user } });
  } catch (err) {
    console.error(err);
    sendProfileError(
      res,
      500,
      ProfileErrorCode.INTERNAL_ERROR,
      "Internal Server Error 💀",
    );
  }
}
export async function updateProfile(
  req: Request,
  res: Response,
): Promise<void> {
  const t0 = Date.now();
  try {
    const user = (
      req as Request & {
        user?: AuthUser;
      }
    ).user;
    if (!user?._id) {
      sendProfileError(res, 401, "UNAUTHORIZED", "Unauthorized");
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await profileService.updateProfile(req, user, body);
    if (!result.ok) {
      sendProfileError(
        res,
        result.status,
        result.code ?? ProfileErrorCode.NO_VALID_FIELDS,
        result.message,
      );
      return;
    }
    await sendProfileSuccess(res, result.user, String(user._id));
  } catch (err) {
    const code = (
      err as {
        code?: number;
      }
    )?.code;
    if (code === 11000) {
      sendProfileError(
        res,
        409,
        ProfileErrorCode.USERNAME_TAKEN,
        "Username is already taken. Choose another.",
      );
      return;
    }
    console.error(err);
    sendProfileError(
      res,
      500,
      ProfileErrorCode.INTERNAL_ERROR,
      "Internal Server Error 💀",
    );
  } finally {
    logProfileWriteTiming("legacy", Date.now() - t0);
  }
}
export async function updateProfileSection(
  req: Request,
  res: Response,
): Promise<void> {
  const t0 = Date.now();
  const rawSection = req.params.section;
  const sectionParam = Array.isArray(rawSection) ? rawSection[0] : rawSection;
  let timingSection = "unknown";
  try {
    const user = (
      req as Request & {
        user?: AuthUser;
      }
    ).user;
    if (!user?._id) {
      sendProfileError(res, 401, "UNAUTHORIZED", "Unauthorized");
      return;
    }
    if (
      typeof sectionParam !== "string" ||
      !isProfileUpdateSection(sectionParam)
    ) {
      sendProfileError(res, 400, "INVALID_SECTION", "Unknown profile section");
      return;
    }
    timingSection = sectionParam;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const result = await profileService.updateProfileSection(
      req,
      user,
      sectionParam,
      body,
    );
    if (!result.ok) {
      sendProfileError(
        res,
        result.status,
        result.code ?? ProfileErrorCode.NO_VALID_FIELDS,
        result.message,
      );
      return;
    }
    await sendProfileSuccess(res, result.user, String(user._id));
  } catch (err) {
    const code = (
      err as {
        code?: number;
      }
    )?.code;
    if (code === 11000) {
      sendProfileError(
        res,
        409,
        ProfileErrorCode.USERNAME_TAKEN,
        "Username is already taken. Choose another.",
      );
      return;
    }
    console.error(err);
    sendProfileError(
      res,
      500,
      ProfileErrorCode.INTERNAL_ERROR,
      "Internal Server Error 💀",
    );
  } finally {
    logProfileWriteTiming(timingSection, Date.now() - t0);
  }
}
