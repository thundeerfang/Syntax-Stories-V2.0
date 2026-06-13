import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  SUBSCRIPTION_PLAN_FREE,
  SUBSCRIPTION_PLAN_KEYS,
  SUBSCRIPTION_STATUS_KEYS,
  SUBSCRIPTION_WRITE_SOURCE_KEYS,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type SubscriptionWriteSource,
} from '../variable/constants.js';

export type { SubscriptionPlan, SubscriptionStatus, SubscriptionWriteSource };

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
      enum: [...SUBSCRIPTION_PLAN_KEYS],
      default: SUBSCRIPTION_PLAN_FREE,
    },
    status: {
      type: String,
      enum: [...SUBSCRIPTION_STATUS_KEYS],
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
    source: {
      type: String,
      enum: [...SUBSCRIPTION_WRITE_SOURCE_KEYS],
      default: 'stripe',
    },
    graceUntil: { type: Date, default: null },
    lastReconciledAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const SubscriptionModel: Model<ISubscription> =
  mongoose.models?.subscriptions ??
  mongoose.model<ISubscription>('subscriptions', SubscriptionSchema);
