import mongoose, { Schema, Document, Model } from "mongoose";
export type AchievementOutboxStatus = "pending" | "published" | "failed";
export interface IAchievementOutboxEvent extends Document {
  aggregateId: string;
  type: string;
  payload: Record<string, unknown>;
  status: AchievementOutboxStatus;
  attempts: number;
  lastError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
const AchievementOutboxEventSchema = new Schema<IAchievementOutboxEvent>(
  {
    aggregateId: { type: String, required: true, index: true },
    type: { type: String, required: true, trim: true, maxlength: 64 },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "published", "failed"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0, min: 0 },
    lastError: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, collection: "achievementoutboxevents" },
);
AchievementOutboxEventSchema.index({ status: 1, createdAt: 1 });
export const AchievementOutboxEventModel: Model<IAchievementOutboxEvent> =
  mongoose.models?.AchievementOutboxEvent ??
  mongoose.model<IAchievementOutboxEvent>(
    "AchievementOutboxEvent",
    AchievementOutboxEventSchema,
  );
