import mongoose, { Document, Model } from 'mongoose';
export interface IAnalyticsEvent extends Document {
    /** Event type, e.g. 'profile_view', 'post_view', 'follow', 'like' */
    type: string;
    /** User performing the action (if any) */
    actorId?: mongoose.Types.ObjectId;
    /** Logical target type, e.g. 'profile', 'post' */
    targetType: string;
    /** Target document id (e.g. profile user id, post id) */
    targetId: mongoose.Types.ObjectId;
    /** Unified visitor identity (matches visitorId in ProfileViewEvent) */
    visitorId: string;
    /** Optional free-form metadata for this event */
    metadata?: Record<string, unknown>;
    /** Event timestamp */
    timestamp: Date;
}
export declare const AnalyticsEventModel: Model<IAnalyticsEvent>;
//# sourceMappingURL=AnalyticsEvent.d.ts.map