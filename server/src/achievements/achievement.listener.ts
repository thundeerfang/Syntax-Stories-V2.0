import { env } from "../config/env.js";
import { onAppEvent } from "../shared/events/appEvents.js";
import { dispatchAchievementEvents } from "./achievement.service.js";
import { qualifyReferralByRefereeId } from "../services/gamification/referralProcessor.service.js";
export function registerAchievementListener(): void {
  onAppEvent("profile.updated", (payload) => {
    void dispatchAchievementEvents(payload.actorId, [
      { type: "profile_sync" },
    ]).catch((err) => {
      console.error("[achievements] profile.updated", err);
    });
    if (env.REFERRAL_QUALIFY_MODE === "profile") {
      void qualifyReferralByRefereeId(payload.actorId).catch((err) => {
        console.error("[referral] profile qualify", err);
      });
    }
  });
}
