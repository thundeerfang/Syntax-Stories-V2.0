import mongoose, { Schema } from 'mongoose';
const ProfileViewEventSchema = new Schema({
    profileUserId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    viewerUserId: { type: Schema.Types.ObjectId, ref: 'users', index: true },
    anonKey: { type: String, index: true, maxlength: 120 },
    visitorId: { type: String, required: true, index: true, maxlength: 128 },
    dayBucket: { type: String, required: true, index: true, maxlength: 10 },
    createdAt: { type: Date, default: Date.now },
    source: { type: String, enum: ['profile', 'u_page'], default: 'u_page' },
}, { timestamps: false });
// Legacy indexes (viewerUserId / anonKey) kept for backwards compatibility / ad-hoc queries
ProfileViewEventSchema.index({ profileUserId: 1, viewerUserId: 1, dayBucket: 1 });
ProfileViewEventSchema.index({ profileUserId: 1, anonKey: 1, dayBucket: 1 });
// Primary atomic dedupe index: one event per visitor per profile per day
ProfileViewEventSchema.index({ profileUserId: 1, visitorId: 1, dayBucket: 1, source: 1 }, { unique: true });
// Optional retention (e.g. 90 days)
ProfileViewEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
const ProfileDailyMetricsSchema = new Schema({
    profileUserId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    date: { type: String, required: true, index: true, maxlength: 10 },
    uniqueVisitors: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    loggedInVisitors: { type: Number, default: 0 },
    anonymousVisitors: { type: Number, default: 0 },
    returningVisitors: { type: Number, default: 0 },
    lastUpdatedAt: { type: Date, default: Date.now },
}, { timestamps: false });
ProfileDailyMetricsSchema.index({ profileUserId: 1, date: 1 }, { unique: true });
export const ProfileViewEventModel = mongoose.models?.profile_view_events ?? mongoose.model('profile_view_events', ProfileViewEventSchema);
export const ProfileDailyMetricsModel = mongoose.models?.profile_daily_metrics ?? mongoose.model('profile_daily_metrics', ProfileDailyMetricsSchema);
//# sourceMappingURL=ProfileAnalytics.js.map