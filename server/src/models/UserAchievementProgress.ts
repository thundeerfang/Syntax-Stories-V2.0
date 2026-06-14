import mongoose, { Schema, Document, Model } from "mongoose";
export interface IUnlockedAchievement {
  achievementId: string;
  unlockedAt: Date;
  pointsAwarded: number;
}
export interface IUserAchievementProgress extends Document {
  userId: mongoose.Types.ObjectId;
  unlocked: IUnlockedAchievement[];
  counters: {
    respectGiven: number;
    briefsRead: number;
    hotTakeSwipes: number;
  };
  totalPoints: number;
  catalogVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}
const UnlockedAchievementSchema = new Schema<IUnlockedAchievement>(
  {
    achievementId: { type: String, required: true, trim: true },
    unlockedAt: { type: Date, required: true, default: Date.now },
    pointsAwarded: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);
const UserAchievementProgressSchema = new Schema<IUserAchievementProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: true,
      index: true,
    },
    unlocked: { type: [UnlockedAchievementSchema], default: [] },
    counters: {
      respectGiven: { type: Number, default: 0, min: 0 },
      briefsRead: { type: Number, default: 0, min: 0 },
      hotTakeSwipes: { type: Number, default: 0, min: 0 },
    },
    totalPoints: { type: Number, default: 0, min: 0 },
    catalogVersion: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true },
);
export const UserAchievementProgressModel: Model<IUserAchievementProgress> =
  mongoose.models?.userachievementprogresses ??
  mongoose.model<IUserAchievementProgress>(
    "userachievementprogresses",
    UserAchievementProgressSchema,
  );
