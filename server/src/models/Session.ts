import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  /** Previous hash after rotation — reuse detection. */
  previousRefreshTokenHash?: string;
  /** Groups rotated sessions; revoke all on token reuse. */
  sessionFamilyId?: string;
  rotationGeneration: number;
  deviceFingerprint?: string;
  /** Phase 5 — trust tier for admin sessions. */
  sessionTier?: 'standard' | 'privileged' | 'root' | 'impersonation' | 'service';
  impersonatorId?: mongoose.Types.ObjectId;
  impersonatedUserId?: mongoose.Types.ObjectId;
  deviceName: string;
  userAgent?: string;
  ip?: string;
  lastActiveAt: Date;
  expiresAt: Date;
  revoked: boolean;
  revokedReason?: string;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    previousRefreshTokenHash: { type: String, index: true },
    sessionFamilyId: { type: String, index: true },
    rotationGeneration: { type: Number, default: 0 },
    deviceFingerprint: { type: String },
    sessionTier: {
      type: String,
      enum: ['standard', 'privileged', 'root', 'impersonation', 'service'],
      default: 'standard',
    },
    impersonatorId: { type: Schema.Types.ObjectId, ref: 'users' },
    impersonatedUserId: { type: Schema.Types.ObjectId, ref: 'users' },
    deviceName: { type: String, default: 'Unknown device' },
    userAgent: { type: String },
    ip: { type: String },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false, index: true },
    revokedReason: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SessionSchema.index({ userId: 1, revoked: 1 });

export const SessionModel: Model<ISession> =
  mongoose.models?.sessions ?? mongoose.model<ISession>('sessions', SessionSchema);
