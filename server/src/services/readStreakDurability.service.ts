import type { Types } from 'mongoose';
import { UserModel } from '../models/User.js';
import { computeDailyStreak, loadUtcReadDayMidnightsForReader } from './readStreak.service.js';

/** F.5 — persist best daily `longest` seen from Mongo history (floor when recomputing profile). */
export async function bumpReadStreakLongestFromMongo(
  readerId: Types.ObjectId,
  now = new Date()
): Promise<void> {
  const dates = await loadUtcReadDayMidnightsForReader(readerId);
  const daily = computeDailyStreak(dates, now);
  await UserModel.updateOne({ _id: readerId }, { $max: { readStreakLongest: daily.longest } });
}
