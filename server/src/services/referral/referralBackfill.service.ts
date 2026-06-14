import { UserModel } from "../../models/User.js";
import { ReferralConversionModel } from "../../models/ReferralConversion.js";
import { UserStatsModel } from "../../models/UserStats.js";
let backfillDone = false;
export async function backfillReferralConversionsOnce(): Promise<void> {
  if (backfillDone) return;
  backfillDone = true;
  const referred = await UserModel.find({ referredByUserId: { $ne: null } })
    .select("_id referredByUserId referredAt referralSource createdAt")
    .lean();
  if (referred.length === 0) return;
  console.info(
    `[referral] Backfilling ${referred.length} legacy referral rows…`,
  );
  for (const u of referred) {
    if (!u.referredByUserId) continue;
    const referrerId = u.referredByUserId;
    const refereeId = u._id;
    const exists = await ReferralConversionModel.findOne({ refereeId })
      .select("_id")
      .lean();
    if (exists) continue;
    const convertedAt = u.referredAt ?? u.createdAt ?? new Date();
    try {
      await ReferralConversionModel.create({
        referrerId,
        refereeId,
        status: "verified",
        source:
          (
            u as {
              referralSource?: string;
            }
          ).referralSource?.slice(0, 32) ?? "legacy",
        qualifiedAt: convertedAt,
        convertedAt,
        createdAt: convertedAt,
      });
    } catch (e) {
      const dup =
        (
          e as {
            code?: number;
          }
        ).code === 11000;
      if (!dup) console.warn("[referral] backfill row failed", String(e));
      continue;
    }
  }
  const counts = await ReferralConversionModel.aggregate<{
    _id: unknown;
    n: number;
  }>([
    { $match: { status: { $in: ["verified", "rewarded"] } } },
    { $group: { _id: "$referrerId", n: { $sum: 1 } } },
  ]);
  for (const row of counts) {
    if (!row._id) continue;
    await UserStatsModel.updateOne(
      { userId: row._id },
      { $set: { referralsConverted: row.n } },
      { upsert: true },
    );
  }
  console.info("[referral] Legacy backfill complete");
}
