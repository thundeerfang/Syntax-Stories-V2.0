import mongoose, { Schema, Document, Model } from "mongoose";
import { PROFILE_VIEW_EVENT_RETENTION_SEC } from "../variable/constants.js";
export interface IProfileViewEvent extends Document {
  profileUserId: mongoose.Types.ObjectId;
  viewerUserId?: mongoose.Types.ObjectId;
  anonKey?: string;
  visitorId: string;
  dayBucket: string;
  createdAt: Date;
  source?: "profile" | "u_page";
}
const ProfileViewEventSchema = new Schema<IProfileViewEvent>(
  {
    profileUserId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    viewerUserId: { type: Schema.Types.ObjectId, ref: "users", index: true },
    anonKey: { type: String, index: true, maxlength: 120 },
    visitorId: { type: String, required: true, index: true, maxlength: 128 },
    dayBucket: { type: String, required: true, index: true, maxlength: 10 },
    createdAt: { type: Date, default: Date.now },
    source: { type: String, enum: ["profile", "u_page"], default: "u_page" },
  },
  { timestamps: false },
);
ProfileViewEventSchema.index({
  profileUserId: 1,
  viewerUserId: 1,
  dayBucket: 1,
});
ProfileViewEventSchema.index({ profileUserId: 1, anonKey: 1, dayBucket: 1 });
ProfileViewEventSchema.index(
  { profileUserId: 1, visitorId: 1, dayBucket: 1, source: 1 },
  { unique: true },
);
ProfileViewEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: PROFILE_VIEW_EVENT_RETENTION_SEC },
);
export interface IProfileDailyMetrics extends Document {
  profileUserId: mongoose.Types.ObjectId;
  date: string;
  uniqueVisitors: number;
  totalViews: number;
  loggedInVisitors: number;
  anonymousVisitors: number;
  returningVisitors: number;
  lastUpdatedAt: Date;
}
const ProfileDailyMetricsSchema = new Schema<IProfileDailyMetrics>(
  {
    profileUserId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    date: { type: String, required: true, index: true, maxlength: 10 },
    uniqueVisitors: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    loggedInVisitors: { type: Number, default: 0 },
    anonymousVisitors: { type: Number, default: 0 },
    returningVisitors: { type: Number, default: 0 },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);
ProfileDailyMetricsSchema.index(
  { profileUserId: 1, date: 1 },
  { unique: true },
);
export const ProfileViewEventModel: Model<IProfileViewEvent> =
  mongoose.models?.profile_view_events ??
  mongoose.model<IProfileViewEvent>(
    "profile_view_events",
    ProfileViewEventSchema,
  );
export const ProfileDailyMetricsModel: Model<IProfileDailyMetrics> =
  mongoose.models?.profile_daily_metrics ??
  mongoose.model<IProfileDailyMetrics>(
    "profile_daily_metrics",
    ProfileDailyMetricsSchema,
  );
