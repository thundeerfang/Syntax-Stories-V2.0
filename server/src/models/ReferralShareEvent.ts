import mongoose, { Schema, Document, Model } from "mongoose";
export interface IReferralShareEvent extends Document {
  userId: mongoose.Types.ObjectId;
  channel: string;
  referralCode?: string;
  createdAt?: Date;
}
const ReferralShareEventSchema = new Schema<IReferralShareEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
      index: true,
    },
    referralCode: { type: String, trim: true, maxlength: 16 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "referralshareevents",
  },
);
ReferralShareEventSchema.index({ userId: 1, createdAt: -1 });
export const ReferralShareEventModel: Model<IReferralShareEvent> =
  mongoose.models?.ReferralShareEvent ??
  mongoose.model<IReferralShareEvent>(
    "ReferralShareEvent",
    ReferralShareEventSchema,
  );
