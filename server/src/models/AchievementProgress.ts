import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAchievementProgress extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId?: string | null;
  achievementId: string;
  current: number;
  target: number;
  percentage: number;
  updatedAt?: Date;
  createdAt?: Date;
}

const AchievementProgressSchema = new Schema<IAchievementProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    tenantId: { type: String, trim: true, maxlength: 64, default: null },
    achievementId: { type: String, required: true, trim: true, maxlength: 64 },
    current: { type: Number, required: true, min: 0, default: 0 },
    target: { type: Number, required: true, min: 1 },
    percentage: { type: Number, required: true, min: 0, max: 100, default: 0 },
  },
  { timestamps: true, collection: 'achievementprogress' }
);

AchievementProgressSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

export const AchievementProgressModel: Model<IAchievementProgress> =
  mongoose.models?.AchievementProgress ??
  mongoose.model<IAchievementProgress>('AchievementProgress', AchievementProgressSchema);
