import { env } from "../config/env.js";
import { onAppEvent } from "../shared/events/appEvents.js";
import { dispatchAchievementEvents } from "../services/achievements/dispatchAchievementEvents.js";
import { qualifyReferralByRefereeId } from "../services/gamification/referralProcessor.service.js";
import { profileAchievementEventsForUpdates } from "../modules/profile/profile.achievements.js";
export function registerAchievementListener(): void {
  onAppEvent("profile.updated", (payload) => {
    const events = profileAchievementEventsForUpdates(payload.updates);
    if (events.length > 0) {
      void dispatchAchievementEvents(payload.actorId, events).catch((err) => {
        console.error("[achievements] profile.updated", err);
      });
    }
    if (env.REFERRAL_QUALIFY_MODE === "profile") {
      void qualifyReferralByRefereeId(payload.actorId).catch((err) => {
        console.error("[referral] profile qualify", err);
      });
    }
  });
}
