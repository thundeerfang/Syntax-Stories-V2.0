import mongoose, { Schema, Document, Model } from "mongoose";
export type GamificationOutboxStatus = "pending" | "published" | "failed";
export interface IGamificationOutboxEvent extends Document {
  aggregateId: string;
  type: string;
  payload: Record<string, unknown>;
  status: GamificationOutboxStatus;
  attempts: number;
  lastError?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
const GamificationOutboxEventSchema = new Schema<IGamificationOutboxEvent>(
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
  { timestamps: true, collection: "gamificationoutboxevents" },
);
GamificationOutboxEventSchema.index({ status: 1, createdAt: 1 });
export const GamificationOutboxEventModel: Model<IGamificationOutboxEvent> =
  mongoose.models?.GamificationOutboxEvent ??
  mongoose.model<IGamificationOutboxEvent>(
    "GamificationOutboxEvent",
    GamificationOutboxEventSchema,
  );
