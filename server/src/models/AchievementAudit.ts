import mongoose, { Schema, Document, Model } from 'mongoose';

export type AchievementAuditAction =
  | 'unlocked'
  | 'progress_updated'
  | 'revoked'
  | 'validation_blocked';

export interface IAchievementAudit extends Document {
  userId: mongoose.Types.ObjectId;
  achievementId?: string;
  action: AchievementAuditAction;
  sourceEvent?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

const AchievementAuditSchema = new Schema<IAchievementAudit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    achievementId: { type: String, trim: true, maxlength: 64 },
    action: {
      type: String,
      required: true,
      enum: ['unlocked', 'progress_updated', 'revoked', 'validation_blocked'],
    },
    sourceEvent: { type: String, trim: true, maxlength: 120 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'achievementaudit' }
);

AchievementAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AchievementAuditModel: Model<IAchievementAudit> =
  mongoose.models?.AchievementAudit ??
  mongoose.model<IAchievementAudit>('AchievementAudit', AchievementAuditSchema);
