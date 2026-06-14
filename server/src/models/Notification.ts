import mongoose, { Schema, Document, Model } from "mongoose";
import type {
  NotificationIcon,
  NotificationType,
} from "../services/notifications/notification.types.js";
export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  kind: NotificationType;
  title: string;
  message: string;
  href: string;
  icon: NotificationIcon;
  metadata?: Record<string, unknown>;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    kind: { type: String, required: true, index: true, maxlength: 40 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    href: { type: String, required: true, trim: true, maxlength: 500 },
    icon: { type: String, required: true, default: "bell", maxlength: 32 },
    metadata: { type: Schema.Types.Mixed },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
export const NotificationModel: Model<INotification> =
  mongoose.models?.notifications ??
  mongoose.model<INotification>("notifications", NotificationSchema);
