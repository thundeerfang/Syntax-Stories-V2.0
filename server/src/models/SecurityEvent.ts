import mongoose, { Schema, Document, Model } from 'mongoose';

export const SECURITY_EVENT_TYPES = [
  'login_success',
  'login_failure',
  'logout',
  'session_created',
  'session_revoked',
  'provider_disconnect',
  'twofa_enabled',
  'twofa_disabled',
  'account_locked',
  'account_unlocked',
  'oauth_login',
  'password_change',
  'password_reset_request',
  'password_reset_success',
] as const;

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export interface ISecurityEvent extends Document {
  userId?: mongoose.Types.ObjectId;
  type: SecurityEventType;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const SecurityEventSchema = new Schema<ISecurityEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: false, index: true },
    type: {
      type: String,
      required: true,
      enum: SECURITY_EVENT_TYPES,
    },
    ip: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const SecurityEventModel: Model<ISecurityEvent> =
  mongoose.models?.securityevents ?? mongoose.model<ISecurityEvent>('securityevents', SecurityEventSchema);
