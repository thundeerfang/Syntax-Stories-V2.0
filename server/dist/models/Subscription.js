import mongoose, { Schema } from 'mongoose';
const SubscriptionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, unique: true, index: true },
    plan: {
        type: String,
        enum: ['free', 'pro', 'proplus', 'ultra', 'premium'],
        default: 'free',
    },
    status: {
        type: String,
        enum: [
            'active',
            'canceled',
            'past_due',
            'trialing',
            'unpaid',
            'incomplete',
            'incomplete_expired',
            'paused',
        ],
        default: 'active',
    },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    trialEnd: { type: Date },
    stripeSubscriptionId: { type: String, sparse: true, unique: true },
    stripePriceId: { type: String },
    version: { type: Number, default: 1 },
    lastSyncedAt: { type: Date },
    lastAppliedStripeEventCreated: { type: Number, default: null },
    source: { type: String, enum: ['stripe', 'manual'], default: 'stripe' },
    graceUntil: { type: Date, default: null },
    lastReconciledAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });
export const SubscriptionModel = mongoose.models?.subscriptions ?? mongoose.model('subscriptions', SubscriptionSchema);
//# sourceMappingURL=Subscription.js.map