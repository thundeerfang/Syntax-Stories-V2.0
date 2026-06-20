import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlatformStatsSnapshot extends Document {
  dayKey: string;
  timezone: string;
  linesWritten: number;
  activeUsers: number;
  components: number;
  uptimePercent: number;
  collectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformStatsSnapshotSchema = new Schema<IPlatformStatsSnapshot>(
  {
    dayKey: { type: String, required: true, unique: true, index: true },
    timezone: { type: String, required: true, default: "Asia/Kolkata" },
    linesWritten: { type: Number, required: true, min: 0, default: 0 },
    activeUsers: { type: Number, required: true, min: 0, default: 0 },
    components: { type: Number, required: true, min: 0, default: 0 },
    uptimePercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    collectedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

export const PlatformStatsSnapshotModel: Model<IPlatformStatsSnapshot> =
  mongoose.models?.platform_stats_snapshots ??
  mongoose.model<IPlatformStatsSnapshot>(
    "platform_stats_snapshots",
    PlatformStatsSnapshotSchema,
  );
