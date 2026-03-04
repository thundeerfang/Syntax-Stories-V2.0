import mongoose, { Schema, Document, Model } from 'mongoose';

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

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, unique: true, index: true },
    plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
    status: { type: String, enum: ['active', 'canceled', 'past_due', 'trialing'], default: 'active' },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const SubscriptionModel: Model<ISubscription> =
  mongoose.models?.subscriptions ?? mongoose.model<ISubscription>('subscriptions', SubscriptionSchema);
