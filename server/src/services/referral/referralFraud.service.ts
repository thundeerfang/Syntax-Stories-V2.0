import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { SessionModel } from '../../models/Session.js';
import { ReferralConversionModel } from '../../models/ReferralConversion.js';

export type ReferralFraudResult =
  | { pass: true }
  | { pass: false; reason: string; code: 'self_device' | 'same_ip' | 'velocity' | 'policy' };

export async function checkReferralFraud(args: {
  referrerId: string;
  refereeId: string;
  deviceHash?: string;
  ipHash?: string;
}): Promise<ReferralFraudResult> {
  const { referrerId, refereeId, deviceHash, ipHash } = args;

  if (!mongoose.isValidObjectId(referrerId) || !mongoose.isValidObjectId(refereeId)) {
    return { pass: false, reason: 'invalid_ids', code: 'policy' };
  }

  if (deviceHash) {
    const referrerSession = await SessionModel.findOne({
      userId: referrerId,
      deviceFingerprint: deviceHash,
      expiresAt: { $gt: new Date() },
    })
      .select('_id')
      .lean();
    if (referrerSession) {
      return { pass: false, reason: 'same_device', code: 'self_device' };
    }
  }

  if (ipHash) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sameIpToday = await ReferralConversionModel.findOne({
      referrerId,
      ipHash,
      createdAt: { $gte: startOfDay },
      status: { $in: ['pending', 'verified', 'rewarded'] },
    })
      .select('_id')
      .lean();
    if (sameIpToday) {
      return { pass: false, reason: 'same_ip_same_day', code: 'same_ip' };
    }
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentVerified = await ReferralConversionModel.countDocuments({
    referrerId,
    status: { $in: ['verified', 'rewarded'] },
    qualifiedAt: { $gte: oneHourAgo },
  });
  if (recentVerified >= env.REFERRAL_VELOCITY_LIMIT) {
    return { pass: false, reason: 'velocity_limit', code: 'velocity' };
  }

  return { pass: true };
}
