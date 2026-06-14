import mongoose, { Schema, Document, Model } from "mongoose";
export type RewardSourceType =
  | "referral"
  | "achievement"
  | "quest"
  | "campaign";
export type RewardType = "xp" | "badge" | "coins" | "points";
export interface IRewardGrant extends Document {
  userId: mongoose.Types.ObjectId;
  sourceType: RewardSourceType;
  sourceId: string;
  rewardType: RewardType;
  amount?: number;
  createdAt?: Date;
}
const RewardGrantSchema = new Schema<IRewardGrant>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      required: true,
      enum: ["referral", "achievement", "quest", "campaign"],
    },
    sourceId: { type: String, required: true, trim: true, maxlength: 128 },
    rewardType: {
      type: String,
      required: true,
      enum: ["xp", "badge", "coins", "points"],
    },
    amount: { type: Number, min: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "rewardgrants",
  },
);
RewardGrantSchema.index(
  { userId: 1, sourceType: 1, sourceId: 1, rewardType: 1 },
  { unique: true },
);
export const RewardGrantModel: Model<IRewardGrant> =
  mongoose.models?.RewardGrant ??
  mongoose.model<IRewardGrant>("RewardGrant", RewardGrantSchema);
