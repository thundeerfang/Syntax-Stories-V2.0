import mongoose, { Schema, Document, Model } from 'mongoose';

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

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: { type: String, required: true, index: true, maxlength: 64 },
    actorId: { type: Schema.Types.ObjectId, ref: 'users' },
    targetType: { type: String, required: true, index: true, maxlength: 64 },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    visitorId: { type: String, required: true, index: true, maxlength: 128 },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

AnalyticsEventSchema.index({ type: 1, targetId: 1, visitorId: 1, timestamp: 1 });

export const AnalyticsEventModel: Model<IAnalyticsEvent> =
  mongoose.models?.analytics_events ?? mongoose.model<IAnalyticsEvent>('analytics_events', AnalyticsEventSchema);

