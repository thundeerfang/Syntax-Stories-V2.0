import mongoose, { Schema } from 'mongoose';
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
];
const SecurityEventSchema = new Schema({
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
}, { timestamps: true });
export const SecurityEventModel = mongoose.models?.securityevents ?? mongoose.model('securityevents', SecurityEventSchema);
//# sourceMappingURL=SecurityEvent.js.map