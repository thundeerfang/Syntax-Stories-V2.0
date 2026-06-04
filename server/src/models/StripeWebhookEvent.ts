import mongoose, { Schema, Document, Model } from 'mongoose';

export type WebhookEventLifecycle = 'pending' | 'processed' | 'failed' | 'dead';

export interface IStripeWebhookEvent extends Document {
  eventId: string;
  type: string;
  status: WebhookEventLifecycle;
  retryCount: number;
  nextRetryAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StripeWebhookEventSchema = new Schema<IStripeWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed', 'dead'],
      required: true,
      default: 'pending',
      index: true,
    },
    retryCount: { type: Number, default: 0 },
    nextRetryAt: { type: Date, index: true },
    lastError: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

StripeWebhookEventSchema.index({ status: 1, nextRetryAt: 1 });

export const StripeWebhookEventModel: Model<IStripeWebhookEvent> =
  mongoose.models?.stripe_webhook_events ??
  mongoose.model<IStripeWebhookEvent>('stripe_webhook_events', StripeWebhookEventSchema);
