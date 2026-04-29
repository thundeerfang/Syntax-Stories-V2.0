import mongoose, { Document, Model } from 'mongoose';
export type SubscriptionPlan = 'free' | 'pro' | 'premium';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';
export interface ISubscription extends Document {
    userId: mongoose.Types.ObjectId;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SubscriptionModel: Model<ISubscription>;
//# sourceMappingURL=Subscription.d.ts.map