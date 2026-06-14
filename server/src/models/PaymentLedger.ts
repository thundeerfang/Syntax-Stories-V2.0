import mongoose, { Schema, Document, Model } from "mongoose";
export type LedgerInvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "void"
  | "uncollectible"
  | "uncollectable";
export interface IPaymentLedger extends Document {
  userId: mongoose.Types.ObjectId;
  stripeInvoiceId: string;
  stripePaymentIntentId?: string;
  chargeId?: string;
  amountPaid: number;
  currency: string;
  status: LedgerInvoiceStatus;
  paidAt?: Date;
  description?: string;
  lineSummary?: string;
  hostedInvoiceUrl?: string;
  invoicePdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
const PaymentLedgerSchema = new Schema<IPaymentLedger>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    stripeInvoiceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    stripePaymentIntentId: { type: String },
    chargeId: { type: String },
    amountPaid: { type: Number, required: true, default: 0 },
    currency: { type: String, required: true, default: "inr" },
    status: {
      type: String,
      enum: ["draft", "open", "paid", "void", "uncollectible", "uncollectable"],
      required: true,
    },
    paidAt: { type: Date },
    description: { type: String },
    lineSummary: { type: String },
    hostedInvoiceUrl: { type: String },
    invoicePdfUrl: { type: String },
  },
  { timestamps: true },
);
PaymentLedgerSchema.index({ userId: 1, paidAt: -1 });
export const PaymentLedgerModel: Model<IPaymentLedger> =
  mongoose.models?.payment_ledgers ??
  mongoose.model<IPaymentLedger>("payment_ledgers", PaymentLedgerSchema);
