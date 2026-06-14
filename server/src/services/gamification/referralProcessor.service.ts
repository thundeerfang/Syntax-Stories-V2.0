import { env } from "../../config/env.js";
import { ReferralConversionModel } from "../../models/ReferralConversion.js";
import { emitAppEvent } from "../../shared/events/appEvents.js";
import { dispatchAchievementEvents } from "../achievements/dispatchAchievementEvents.js";
import { grantReward } from "./rewardEngine.service.js";
import { checkReferralFraud } from "../referral/referralFraud.service.js";
import {
  markReferralRejected,
  markReferralRewarded,
  markReferralVerified,
} from "../referral/referralConversion.service.js";
import { addReferralLeaderboardScore } from "../referral/referralStatsCache.service.js";
export async function processReferralAttribution(
  conversionId: string,
): Promise<void> {
  const doc = await ReferralConversionModel.findById(conversionId).lean();
  if (!doc || doc.status !== "pending") return;
  const referrerId = String(doc.referrerId);
  const refereeId = String(doc.refereeId);
  const fraud = await checkReferralFraud({
    referrerId,
    refereeId,
    deviceHash: doc.deviceHash,
    ipHash: doc.ipHash,
  });
  if (!fraud.pass) {
    await markReferralRejected(conversionId, fraud.reason);
    emitAppEvent("referral.rejected", {
      conversionId,
      referrerId,
      refereeUserId: refereeId,
      reason: fraud.reason,
      code: fraud.code,
    });
    return;
  }
  if (env.REFERRAL_QUALIFY_MODE === "profile") {
    emitAppEvent("referral.signup_completed", {
      conversionId,
      referrerId,
      refereeUserId: refereeId,
      source: doc.source,
    });
    return;
  }
  await verifyAndRewardReferral(conversionId);
}
export async function verifyAndRewardReferral(
  conversionId: string,
): Promise<void> {
  const verified = await markReferralVerified(conversionId);
  if (!verified.ok || !verified.referrerId || !verified.refereeId) return;
  const { referrerId, refereeId, source } = verified;
  emitAppEvent("referral.converted", {
    referrerId,
    refereeUserId: refereeId,
    source: source ?? "unknown",
    conversionId,
  });
  void addReferralLeaderboardScore(referrerId, 1);
  const xp = env.REFERRAL_REFERRER_XP;
  if (xp > 0) {
    const grant = await grantReward({
      userId: referrerId,
      sourceType: "referral",
      sourceId: conversionId,
      rewardType: "xp",
      amount: xp,
    });
    if (grant.granted) {
      await markReferralRewarded(conversionId, xp);
      emitAppEvent("referral.rewarded", {
        conversionId,
        referrerId,
        refereeUserId: refereeId,
        rewardType: "xp",
        amount: xp,
      });
    }
  }
  void dispatchAchievementEvents(referrerId, [{ type: "referral_converted" }], {
    source: "referral.verified",
  });
}
export async function qualifyReferralByRefereeId(
  refereeUserId: string,
): Promise<void> {
  const doc = await ReferralConversionModel.findOne({
    refereeId: refereeUserId,
    status: "pending",
  }).lean();
  if (!doc) return;
  await verifyAndRewardReferral(String(doc._id));
}
