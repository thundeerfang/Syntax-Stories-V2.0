import mongoose, { Schema } from 'mongoose';
const AnalyticsEventSchema = new Schema({
    type: { type: String, required: true, index: true, maxlength: 64 },
    actorId: { type: Schema.Types.ObjectId, ref: 'users' },
    targetType: { type: String, required: true, index: true, maxlength: 64 },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    visitorId: { type: String, required: true, index: true, maxlength: 128 },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });
AnalyticsEventSchema.index({ type: 1, targetId: 1, visitorId: 1, timestamp: 1 });
export const AnalyticsEventModel = mongoose.models?.analytics_events ?? mongoose.model('analytics_events', AnalyticsEventSchema);
//# sourceMappingURL=AnalyticsEvent.js.map