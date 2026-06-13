import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAchievementEventLog extends Document {
  userId: mongoose.Types.ObjectId;
  event: string;
  source?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

const AchievementEventLogSchema = new Schema<IAchievementEventLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    event: { type: String, required: true, trim: true, maxlength: 64 },
    source: { type: String, trim: true, maxlength: 200 },
    ip: { type: String, trim: true, maxlength: 64 },
    userAgent: { type: String, trim: true, maxlength: 500 },
    sessionId: { type: String, trim: true, maxlength: 128 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'achievementeventlogs' }
);

AchievementEventLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AchievementEventLogModel: Model<IAchievementEventLog> =
  mongoose.models?.AchievementEventLog ??
  mongoose.model<IAchievementEventLog>('AchievementEventLog', AchievementEventLogSchema);
