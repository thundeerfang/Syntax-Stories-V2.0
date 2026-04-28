import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  deviceName: string;
  userAgent?: string;
  ip?: string;
  lastActiveAt: Date;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    deviceName: { type: String, default: 'Unknown device' },
    userAgent: { type: String },
    ip: { type: String },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SessionSchema.index({ userId: 1, revoked: 1 });

export const SessionModel: Model<ISession> =
  mongoose.models?.sessions ?? mongoose.model<ISession>('sessions', SessionSchema);
