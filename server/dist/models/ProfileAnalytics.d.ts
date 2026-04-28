import mongoose, { Document, Model } from 'mongoose';
export interface IProfileViewEvent extends Document {
    profileUserId: mongoose.Types.ObjectId;
    viewerUserId?: mongoose.Types.ObjectId;
    anonKey?: string;
    /** Unified visitor identity (logged-in user id or anon fingerprint) */
    visitorId: string;
    dayBucket: string;
    createdAt: Date;
    source?: 'profile' | 'u_page';
}
export interface IProfileDailyMetrics extends Document {
    profileUserId: mongoose.Types.ObjectId;
    date: string;
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
export declare const ProfileViewEventModel: Model<IProfileViewEvent>;
export declare const ProfileDailyMetricsModel: Model<IProfileDailyMetrics>;
//# sourceMappingURL=ProfileAnalytics.d.ts.map