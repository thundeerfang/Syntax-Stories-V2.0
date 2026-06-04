import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlatformNotificationConfig extends Document {
  singleton: 'default';
  webhookEnabled: boolean;
  webhookUrl?: string;
  /** Optional secret sent as X-Webhook-Secret header on outbound POSTs. */
  webhookSecret?: string;
  updatedAt: Date;
}

export const DEFAULT_PLATFORM_NOTIFICATION_CONFIG = {
  webhookEnabled: false,
  webhookUrl: '',
  webhookSecret: '',
};

const PlatformNotificationConfigSchema = new Schema<IPlatformNotificationConfig>(
  {
    singleton: { type: String, default: 'default', unique: true, immutable: true },
    webhookEnabled: { type: Boolean, default: false },
    webhookUrl: { type: String, trim: true, maxlength: 2000, default: '' },
    webhookSecret: { type: String, trim: true, maxlength: 256, select: false, default: '' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const PlatformNotificationConfigModel: Model<IPlatformNotificationConfig> =
  mongoose.models?.platform_notification_configs ??
  mongoose.model<IPlatformNotificationConfig>(
    'platform_notification_configs',
    PlatformNotificationConfigSchema
  );
