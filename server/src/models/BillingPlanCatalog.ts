import mongoose, { Schema, Document, Model } from "mongoose";
import { PAID_PLAN_KEYS, type PaidPlanKey } from "../variable/constants.js";
export type { PaidPlanKey };
export interface IBillingPlanCatalog extends Document {
  key: PaidPlanKey;
  name: string;
  description: string;
  amountDisplay: string;
  currency: string;
  amountMinor: number;
  cadence: string;
  features: string[];
  featured: boolean;
  badge?: string | null;
  sortOrder: number;
  active: boolean;
  stripePriceId?: string | null;
}
const BillingPlanCatalogSchema = new Schema<IBillingPlanCatalog>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: [...PAID_PLAN_KEYS],
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 280 },
    amountDisplay: { type: String, required: true, trim: true, maxlength: 32 },
    currency: {
      type: String,
      required: true,
      trim: true,
      default: "INR",
      maxlength: 8,
    },
    amountMinor: { type: Number, required: true, min: 0 },
    cadence: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
      default: "per month",
    },
    features: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    badge: { type: String, trim: true, maxlength: 40, default: null },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    stripePriceId: { type: String, trim: true, default: null },
  },
  { timestamps: true, collection: "billingplancatalog" },
);
BillingPlanCatalogSchema.index({ active: 1, sortOrder: 1 });
export const BillingPlanCatalogModel: Model<IBillingPlanCatalog> =
  mongoose.models?.BillingPlanCatalog ??
  mongoose.model<IBillingPlanCatalog>(
    "BillingPlanCatalog",
    BillingPlanCatalogSchema,
  );
