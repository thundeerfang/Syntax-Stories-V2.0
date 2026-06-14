import mongoose, { Schema, Document, Model } from "mongoose";
export interface IAnalyticsEvent extends Document {
  type: string;
  actorId?: mongoose.Types.ObjectId;
  targetType: string;
  targetId: mongoose.Types.ObjectId;
  visitorId: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: { type: String, required: true, index: true, maxlength: 64 },
    actorId: { type: Schema.Types.ObjectId, ref: "users" },
    targetType: { type: String, required: true, index: true, maxlength: 64 },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    visitorId: { type: String, required: true, index: true, maxlength: 128 },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);
AnalyticsEventSchema.index({
  type: 1,
  targetId: 1,
  visitorId: 1,
  timestamp: 1,
});
export const AnalyticsEventModel: Model<IAnalyticsEvent> =
  mongoose.models?.analytics_events ??
  mongoose.model<IAnalyticsEvent>("analytics_events", AnalyticsEventSchema);
