import mongoose from 'mongoose';
import { ReferralConversionModel, type ReferralStatus } from '../../models/ReferralConversion.js';
import { normalizeProfileImg } from '../../models/User.js';
import { UserStatsModel } from '../../models/UserStats.js';
import { getOrCreateUserStats } from '../achievements/userStats.service.js';
import { invalidateReferralUserStatsCache } from './referralStatsCache.service.js';

export async function createReferralConversion(args: {
  referrerId: string;
  refereeId: string;
  source: string;
  deviceHash?: string;
  ipHash?: string;
}): Promise<{ conversionId: string; created: boolean }> {
  const referrerOid = new mongoose.Types.ObjectId(args.referrerId);
  const refereeOid = new mongoose.Types.ObjectId(args.refereeId);

  try {
    const doc = await ReferralConversionModel.create({
      referrerId: referrerOid,
      refereeId: refereeOid,
      status: 'pending',
      source: args.source.slice(0, 32),
      deviceHash: args.deviceHash,
      ipHash: args.ipHash,
    });

    await UserStatsModel.updateOne(
      { userId: referrerOid },
      { $inc: { referralsPending: 1 } },
      { upsert: true }
    );
    void invalidateReferralUserStatsCache(args.referrerId);

    return { conversionId: String(doc._id), created: true };
  } catch (e) {
    const dup = (e as { code?: number }).code === 11000;
    if (!dup) throw e;
    const existing = await ReferralConversionModel.findOne({ refereeId: refereeOid }).lean();
    return { conversionId: existing?._id ? String(existing._id) : '', created: false };
  }
}

export async function markReferralRejected(
  conversionId: string,
  reason: string
): Promise<boolean> {
  const res = await ReferralConversionModel.updateOne(
    { _id: conversionId, status: 'pending' },
    { $set: { status: 'rejected', rejectReason: reason.slice(0, 128) } }
  );
  if (res.modifiedCount === 0) return false;

  const doc = await ReferralConversionModel.findById(conversionId).select('referrerId').lean();
  if (doc?.referrerId) {
    await UserStatsModel.updateOne(
      { userId: doc.referrerId, referralsPending: { $gt: 0 } },
      { $inc: { referralsPending: -1 } }
    );
    void invalidateReferralUserStatsCache(String(doc.referrerId));
  }
  return true;
}

export async function markReferralVerified(conversionId: string): Promise<{
  ok: boolean;
  referrerId?: string;
  refereeId?: string;
  source?: string;
}> {
  const now = new Date();
  const doc = await ReferralConversionModel.findOneAndUpdate(
    { _id: conversionId, status: 'pending' },
    {
      $set: {
        status: 'verified',
        qualifiedAt: now,
        convertedAt: now,
      },
    },
    { new: true }
  ).lean();

  if (!doc) return { ok: false };

  const referrerId = String(doc.referrerId);
  await getOrCreateUserStats(referrerId);
  await UserStatsModel.updateOne(
    { userId: doc.referrerId },
    { $inc: { referralsConverted: 1, referralsPending: -1 } }
  );
  void invalidateReferralUserStatsCache(referrerId);

  return {
    ok: true,
    referrerId,
    refereeId: String(doc.refereeId),
    source: doc.source,
  };
}

export async function markReferralRewarded(
  conversionId: string,
  rewardAmount: number
): Promise<boolean> {
  const res = await ReferralConversionModel.updateOne(
    { _id: conversionId, status: 'verified' },
    { $set: { status: 'rewarded', rewardedAt: new Date(), rewardAmount } }
  );
  return res.modifiedCount > 0;
}

export async function listReferralConversions(args: {
  referrerId: string;
  limit: number;
  skip: number;
}): Promise<{
  total: number;
  items: Array<{
    id: string;
    username: string;
    fullName: string;
    profileImg: string;
    joinedAt: string | null;
    isActive: boolean;
    status: ReferralStatus;
  }>;
}> {
  const referrerOid = new mongoose.Types.ObjectId(args.referrerId);
  const filter = { referrerId: referrerOid };

  const [total, rows] = await Promise.all([
    ReferralConversionModel.countDocuments(filter),
    ReferralConversionModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(args.skip)
      .limit(args.limit)
      .populate('refereeId', 'username fullName profileImg createdAt isActive')
      .lean(),
  ]);

  const items = rows
    .map((r) => {
      const u = r.refereeId as unknown as {
        _id?: mongoose.Types.ObjectId;
        username?: string;
        fullName?: string;
        profileImg?: string;
        createdAt?: Date;
        isActive?: boolean;
      };
      if (!u?.username) return null;
      return {
        id: u._id ? String(u._id) : String(r.refereeId),
        username: u.username,
        fullName: u.fullName ?? u.username,
        profileImg: normalizeProfileImg(u.profileImg),
        joinedAt: u.createdAt?.toISOString?.() ?? null,
        isActive: Boolean(u.isActive),
        status: r.status as ReferralStatus,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return { total, items };
}

export async function getReferralStatsCounts(referrerId: string): Promise<{
  converted: number;
  pending: number;
  rewarded: number;
  rejected: number;
}> {
  const referrerOid = new mongoose.Types.ObjectId(referrerId);
  const [converted, pending, rewarded, rejected] = await Promise.all([
    ReferralConversionModel.countDocuments({
      referrerId: referrerOid,
      status: { $in: ['verified', 'rewarded'] },
    }),
    ReferralConversionModel.countDocuments({ referrerId: referrerOid, status: 'pending' }),
    ReferralConversionModel.countDocuments({ referrerId: referrerOid, status: 'rewarded' }),
    ReferralConversionModel.countDocuments({ referrerId: referrerOid, status: 'rejected' }),
  ]);
  return { converted, pending, rewarded, rejected };
}
