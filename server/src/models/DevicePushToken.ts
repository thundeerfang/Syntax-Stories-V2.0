import mongoose, { Schema, Document, Model } from "mongoose";

export type PushPlatform = "ios" | "android";

export interface IDevicePushToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: PushPlatform;
  createdAt: Date;
  updatedAt: Date;
}

const DevicePushTokenSchema = new Schema<IDevicePushToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    token: { type: String, required: true, trim: true, maxlength: 512 },
    platform: {
      type: String,
      required: true,
      enum: ["ios", "android"],
    },
  },
  { timestamps: true },
);

DevicePushTokenSchema.index({ token: 1 }, { unique: true });
DevicePushTokenSchema.index({ userId: 1, platform: 1 });

export const DevicePushTokenModel: Model<IDevicePushToken> =
  mongoose.models?.device_push_tokens ??
  mongoose.model<IDevicePushToken>(
    "device_push_tokens",
    DevicePushTokenSchema,
  );
