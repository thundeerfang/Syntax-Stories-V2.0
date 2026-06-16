import mongoose from "mongoose";
import {
  DevicePushTokenModel,
  type PushPlatform,
} from "../../models/DevicePushToken.js";

export async function registerDevicePushToken(
  userId: string,
  token: string,
  platform: PushPlatform,
): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) return;
  await DevicePushTokenModel.findOneAndUpdate(
    { token: trimmed },
    {
      $set: {
        userId: new mongoose.Types.ObjectId(userId),
        platform,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function unregisterDevicePushToken(
  userId: string,
  token: string,
): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) return;
  await DevicePushTokenModel.deleteOne({
    userId: new mongoose.Types.ObjectId(userId),
    token: trimmed,
  });
}

export async function listDevicePushTokensForUser(
  userId: string,
): Promise<string[]> {
  const rows = await DevicePushTokenModel.find({
    userId: new mongoose.Types.ObjectId(userId),
  })
    .select("token")
    .lean();
  return rows.map((r) => r.token).filter(Boolean);
}

export async function removeInvalidPushTokens(tokens: string[]): Promise<void> {
  if (!tokens.length) return;
  await DevicePushTokenModel.deleteMany({ token: { $in: tokens } });
}
