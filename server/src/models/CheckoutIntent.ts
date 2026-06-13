import mongoose, { Schema, Document, Model } from 'mongoose';

export type PaidPlanKey = 'pro' | 'proplus' | 'ultra';

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
    planKey: { type: String, enum: ['pro', 'proplus', 'ultra'], required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

export const CheckoutIntentModel: Model<ICheckoutIntent> =
  mongoose.models?.checkout_intents ??
  mongoose.model<ICheckoutIntent>('checkout_intents', CheckoutIntentSchema);
