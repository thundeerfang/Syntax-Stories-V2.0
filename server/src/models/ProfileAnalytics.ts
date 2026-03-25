import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProfileViewEvent extends Document {
  profileUserId: mongoose.Types.ObjectId;
  viewerUserId?: mongoose.Types.ObjectId;
  anonKey?: string;
  /** Unified visitor identity (logged-in user id or anon fingerprint) */
  visitorId: string;
  dayBucket: string; // YYYY-MM-DD
  createdAt: Date;
  source?: 'profile' | 'u_page';
}

const ProfileViewEventSchema = new Schema<IProfileViewEvent>(
  {
    profileUserId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    viewerUserId: { type: Schema.Types.ObjectId, ref: 'users', index: true },
    anonKey: { type: String, index: true, maxlength: 120 },
    visitorId: { type: String, required: true, index: true, maxlength: 128 },
    dayBucket: { type: String, required: true, index: true, maxlength: 10 },
    createdAt: { type: Date, default: Date.now },
    source: { type: String, enum: ['profile', 'u_page'], default: 'u_page' },
  },
  { timestamps: false }
);

// Legacy indexes (viewerUserId / anonKey) kept for backwards compatibility / ad-hoc queries
ProfileViewEventSchema.index({ profileUserId: 1, viewerUserId: 1, dayBucket: 1 });
ProfileViewEventSchema.index({ profileUserId: 1, anonKey: 1, dayBucket: 1 });

// Primary atomic dedupe index: one event per visitor per profile per day
ProfileViewEventSchema.index(
  { profileUserId: 1, visitorId: 1, dayBucket: 1, source: 1 },
  { unique: true }
);

// Optional retention (e.g. 90 days)
ProfileViewEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export interface IProfileDailyMetrics extends Document {
  profileUserId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  /** Total unique visitors (logged-in + anonymous) for this day */
  uniqueVisitors: number;
  /** Total counted views for this day (currently equal to uniqueVisitors, 1 per visitor/day) */
  totalViews: number;
  /** Unique logged-in visitors for this day */
  loggedInVisitors: number;
  /** Unique anonymous visitors for this day */
  anonymousVisitors: number;
  /** Visitors that had at least one prior day with a view */
  returningVisitors: number;
  lastUpdatedAt: Date;
}

const ProfileDailyMetricsSchema = new Schema<IProfileDailyMetrics>(
  {
    profileUserId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    date: { type: String, required: true, index: true, maxlength: 10 },
    uniqueVisitors: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    loggedInVisitors: { type: Number, default: 0 },
    anonymousVisitors: { type: Number, default: 0 },
    returningVisitors: { type: Number, default: 0 },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

ProfileDailyMetricsSchema.index({ profileUserId: 1, date: 1 }, { unique: true });

export const ProfileViewEventModel: Model<IProfileViewEvent> =
  mongoose.models?.profile_view_events ?? mongoose.model<IProfileViewEvent>('profile_view_events', ProfileViewEventSchema);

export const ProfileDailyMetricsModel: Model<IProfileDailyMetrics> =
  mongoose.models?.profile_daily_metrics ?? mongoose.model<IProfileDailyMetrics>('profile_daily_metrics', ProfileDailyMetricsSchema);

