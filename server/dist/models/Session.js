import mongoose, { Schema } from 'mongoose';
const SessionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    deviceName: { type: String, default: 'Unknown device' },
    userAgent: { type: String },
    ip: { type: String },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });
SessionSchema.index({ userId: 1, revoked: 1 });
export const SessionModel = mongoose.models?.sessions ?? mongoose.model('sessions', SessionSchema);
//# sourceMappingURL=Session.js.map