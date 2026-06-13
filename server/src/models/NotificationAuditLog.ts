import mongoose, { Schema, Document, Model } from 'mongoose';

export const NOTIFICATION_AUDIT_ACTIONS = [
  'notification.created',
  'notification.webhook.sent',
  'notification.webhook.failed',
  'notification.webhook.skipped',
  'notification.realtime.published',
] as const;

export type NotificationAuditAction = (typeof NOTIFICATION_AUDIT_ACTIONS)[number];

export interface INotificationAuditLog extends Document {
  action: NotificationAuditAction;
  userId?: mongoose.Types.ObjectId;
  notificationId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const NotificationAuditLogSchema = new Schema<INotificationAuditLog>(
  {
    action: { type: String, required: true, index: true, maxlength: 64 },
    userId: { type: Schema.Types.ObjectId, ref: 'users', index: true },
    notificationId: { type: Schema.Types.ObjectId, ref: 'notifications', index: true },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

NotificationAuditLogSchema.index({ userId: 1, timestamp: -1 });
NotificationAuditLogSchema.index({ action: 1, timestamp: -1 });

export const NotificationAuditLogModel: Model<INotificationAuditLog> =
  mongoose.models?.notification_audit_logs ??
  mongoose.model<INotificationAuditLog>('notification_audit_logs', NotificationAuditLogSchema);
