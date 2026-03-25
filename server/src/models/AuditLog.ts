import mongoose, { Schema, Document, Model } from 'mongoose';

export const AUDIT_ACTIONS = [
  'user_signup',
  'user_signin',
  'user_signout',
  'session_created',
  'session_revoked',
  'login_failure',
  'email_change',
  'oauth_login',
  'oauth_connected',
  'oauth_disconnected',
  'twofa_enabled',
  'twofa_disabled',
  'follow',
  'unfollow',
  'profile_updated',
  'profile_view',
  'education_added',
  'education_updated',
  'education_removed',
  'work_added',
  'work_updated',
  'work_removed',
  'project_added',
  'project_updated',
  'project_removed',
  'certification_added',
  'certification_updated',
  'certification_removed',
  'open_source_added',
  'open_source_updated',
  'open_source_removed',
  'stack_tool_added',
  'stack_tool_removed',
  'stack_tools_updated',
  'my_setup_added',
  'my_setup_updated',
  'my_setup_removed',
  'account_locked',
  'account_deleted',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface IAuditLog extends Document {
  action: string;
  actorId?: mongoose.Types.ObjectId;
  targetType?: string;
  targetId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true, maxlength: 64 },
    actorId: { type: Schema.Types.ObjectId, ref: 'users', index: true },
    targetType: { type: String, index: true, maxlength: 64 },
    targetId: { type: Schema.Types.ObjectId, index: true },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

AuditLogSchema.index({ actorId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });

export const AuditLogModel: Model<IAuditLog> =
  mongoose.models?.audit_logs ?? mongoose.model<IAuditLog>('audit_logs', AuditLogSchema);
