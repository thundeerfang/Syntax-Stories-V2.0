import mongoose, { Schema } from 'mongoose';
const SubscriptionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, unique: true, index: true },
    plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
    status: { type: String, enum: ['active', 'canceled', 'past_due', 'trialing'], default: 'active' },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
}, { timestamps: true });
export const SubscriptionModel = mongoose.models?.subscriptions ?? mongoose.model('subscriptions', SubscriptionSchema);
//# sourceMappingURL=Subscription.js.map