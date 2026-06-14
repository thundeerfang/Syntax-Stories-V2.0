import mongoose, { Schema, Document, Model } from "mongoose";
export interface ITrustedDevice extends Document {
  userId: mongoose.Types.ObjectId;
  deviceFingerprint: string;
  deviceName: string;
  userAgent?: string;
  ip?: string;
  trustedAt: Date;
  lastSeenAt: Date;
  revokedAt?: Date | null;
}
const TrustedDeviceSchema = new Schema<ITrustedDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    deviceFingerprint: { type: String, required: true },
    deviceName: { type: String, default: "Unknown device" },
    userAgent: { type: String },
    ip: { type: String },
    trustedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
TrustedDeviceSchema.index(
  { userId: 1, deviceFingerprint: 1 },
  { unique: true },
);
export const TrustedDeviceModel: Model<ITrustedDevice> =
  mongoose.models?.trusted_devices ??
  mongoose.model<ITrustedDevice>("trusted_devices", TrustedDeviceSchema);
