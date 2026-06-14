import mongoose from "mongoose";
import {
  FEEDBACK_WEEKLY_MAX_PER_USER,
  FEEDBACK_WEEKLY_WINDOW_MS,
} from "../../variable/constants.js";
import { FeedbackSubmissionModel } from "../../models/FeedbackSubmission.js";
export type FeedbackWeeklyQuota = {
  limit: number;
  used: number;
  remaining: number;
  windowMs: number;
  resetsAt: string | null;
};
export async function getFeedbackWeeklyQuota(
  userId: string,
): Promise<FeedbackWeeklyQuota> {
  const oid = new mongoose.Types.ObjectId(userId);
  const since = new Date(Date.now() - FEEDBACK_WEEKLY_WINDOW_MS);
  const rows = await FeedbackSubmissionModel.find({
    userId: oid,
    createdAt: { $gte: since },
  })
    .select("createdAt")
    .sort({ createdAt: 1 })
    .lean();
  const used = rows.length;
  const remaining = Math.max(0, FEEDBACK_WEEKLY_MAX_PER_USER - used);
  const oldest = rows[0]?.createdAt;
  const resetsAt =
    oldest instanceof Date
      ? new Date(oldest.getTime() + FEEDBACK_WEEKLY_WINDOW_MS).toISOString()
      : null;
  return {
    limit: FEEDBACK_WEEKLY_MAX_PER_USER,
    used,
    remaining,
    windowMs: FEEDBACK_WEEKLY_WINDOW_MS,
    resetsAt,
  };
}
export async function assertFeedbackWeeklyQuota(
  userId: string,
): Promise<string | null> {
  const q = await getFeedbackWeeklyQuota(userId);
  if (q.remaining > 0) return null;
  return `You can submit up to ${q.limit} feedback per week. Try again after your oldest submission ages out.`;
}
