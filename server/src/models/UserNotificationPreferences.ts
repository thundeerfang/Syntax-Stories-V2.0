import mongoose, { Schema, Document, Model } from "mongoose";
export interface IUserNotificationPreferences extends Document {
  userId: mongoose.Types.ObjectId;
  inAppEnabled: boolean;
  webhookEnabled: boolean;
  webhookUrl?: string;
  milestonesEnabled: boolean;
  followingEnabled: boolean;
  trendingEnabled: boolean;
  settingsEnabled: boolean;
  referralsEnabled: boolean;
  squadsEnabled: boolean;
  categoriesEnabled: boolean;
  tagsEnabled: boolean;
  achievementsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const UserNotificationPreferencesSchema =
  new Schema<IUserNotificationPreferences>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
        unique: true,
        index: true,
      },
      inAppEnabled: { type: Boolean, default: true },
      webhookEnabled: { type: Boolean, default: false },
      webhookUrl: { type: String, trim: true, maxlength: 2000 },
      milestonesEnabled: { type: Boolean, default: true },
      followingEnabled: { type: Boolean, default: true },
      trendingEnabled: { type: Boolean, default: true },
      settingsEnabled: { type: Boolean, default: true },
      referralsEnabled: { type: Boolean, default: true },
      squadsEnabled: { type: Boolean, default: true },
      categoriesEnabled: { type: Boolean, default: true },
      tagsEnabled: { type: Boolean, default: true },
      achievementsEnabled: { type: Boolean, default: true },
    },
    { timestamps: true },
  );
export const UserNotificationPreferencesModel: Model<IUserNotificationPreferences> =
  mongoose.models?.user_notification_preferences ??
  mongoose.model<IUserNotificationPreferences>(
    "user_notification_preferences",
    UserNotificationPreferencesSchema,
  );
