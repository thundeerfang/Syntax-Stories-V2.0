import mongoose, { Schema, Document, Model } from 'mongoose';
import { PAID_PLAN_KEYS, type PaidPlanKey } from '../variable/constants.js';

export type { PaidPlanKey };

export interface ICheckoutIntent extends Document {
  stripeCheckoutSessionId: string;
  userId: mongoose.Types.ObjectId;
  planKey: PaidPlanKey;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CheckoutIntentSchema = new Schema<ICheckoutIntent>(
  {
    stripeCheckoutSessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    planKey: { type: String, enum: [...PAID_PLAN_KEYS], required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

export const CheckoutIntentModel: Model<ICheckoutIntent> =
  mongoose.models?.checkout_intents ??
  mongoose.model<ICheckoutIntent>('checkout_intents', CheckoutIntentSchema);
