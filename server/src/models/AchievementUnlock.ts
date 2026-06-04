import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAchievementUnlock extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId?: string | null;
  achievementId: string;
  pointsAwarded: number;
  xpAwarded: number;
  unlockedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const AchievementUnlockSchema = new Schema<IAchievementUnlock>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    tenantId: { type: String, trim: true, maxlength: 64, default: null },
    achievementId: { type: String, required: true, trim: true, maxlength: 64 },
    pointsAwarded: { type: Number, required: true, min: 0 },
    xpAwarded: { type: Number, required: true, min: 0 },
    unlockedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, collection: 'achievementunlocks' }
);

AchievementUnlockSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
AchievementUnlockSchema.index({ userId: 1, unlockedAt: -1 });

export const AchievementUnlockModel: Model<IAchievementUnlock> =
  mongoose.models?.AchievementUnlock ??
  mongoose.model<IAchievementUnlock>('AchievementUnlock', AchievementUnlockSchema);
