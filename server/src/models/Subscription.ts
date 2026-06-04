import mongoose, { Schema, Document, Model } from 'mongoose';

/** App plan keys; `premium` is legacy — treat as `ultra` in app logic. */
export type SubscriptionPlan = 'free' | 'pro' | 'proplus' | 'ultra' | 'premium';

/** Stripe subscription statuses we persist (subset + common values). */
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'trialing'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

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

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      unique: true,
      index: true,
    },
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
  },
  { timestamps: true }
);

export const SubscriptionModel: Model<ISubscription> =
  mongoose.models?.subscriptions ??
  mongoose.model<ISubscription>('subscriptions', SubscriptionSchema);
