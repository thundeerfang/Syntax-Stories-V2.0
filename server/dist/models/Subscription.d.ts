import mongoose, { Document, Model } from 'mongoose';
/** App plan keys; `premium` is legacy — treat as `ultra` in app logic. */
export type SubscriptionPlan = 'free' | 'pro' | 'proplus' | 'ultra' | 'premium';
/** Stripe subscription statuses we persist (subset + common values). */
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused';
export type SubscriptionWriteSource = 'stripe' | 'manual';
export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: Date;
    /** Stripe subscription id when on a paid Stripe subscription. */
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    version: number;
    lastSyncedAt?: Date;
    lastAppliedStripeEventCreated?: number | null;
    source: SubscriptionWriteSource;
    graceUntil?: Date | null;
    lastReconciledAt?: Date | null;
    metadata?: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SubscriptionModel: Model<ISubscription>;
//# sourceMappingURL=Subscription.d.ts.map