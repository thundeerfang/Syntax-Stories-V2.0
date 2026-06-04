import mongoose, { Schema, Document, Model } from 'mongoose';

export type BillingAuditSource = 'webhook' | 'verify' | 'sync' | 'reconcile' | 'admin';

export interface IBillingAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  source: BillingAuditSource;
  stripeSubscriptionId?: string;
  stripeInvoiceId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: Date;
}

const BillingAuditLogSchema = new Schema<IBillingAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
    action: { type: String, required: true, index: true },
    source: {
      type: String,
      enum: ['webhook', 'verify', 'sync', 'reconcile', 'admin'],
      required: true,
    },
    stripeSubscriptionId: { type: String },
    stripeInvoiceId: { type: String },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const BillingAuditLogModel: Model<IBillingAuditLog> =
  mongoose.models?.billing_audit_logs ??
  mongoose.model<IBillingAuditLog>('billing_audit_logs', BillingAuditLogSchema);
