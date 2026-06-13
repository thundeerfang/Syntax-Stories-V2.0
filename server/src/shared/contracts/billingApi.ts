/**
 * Billing / Stripe JSON API — `/api/billing/*`.
 * Keep in sync with `webapp/src/contracts/billingApi.ts`.
 */

import type { PaidPlanKey, SubscriptionPlan } from '../../variable/constants.js';

export type BillingPlanKey = SubscriptionPlan;

export type BillingPaidPlanKey = PaidPlanKey;

export type BillingPlanCatalogItem = {
  key: BillingPaidPlanKey;
  name: string;
  description: string;
  amountDisplay: string;
  currency: string;
  amountMinor: number;
  cadence: string;
  features: string[];
  featured?: boolean;
  badge?: string;
  checkoutEnabled: boolean;
};

export interface BillingPlansResponse {
  success: boolean;
  plans: BillingPlanCatalogItem[];
}

export type BillingSubscriptionDto = {
  planKey: BillingPlanKey;
  planDisplayName: string;
  status: string;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isGraceActive: boolean;
  graceUntil: string | null;
  lastSyncedAt: string | null;
  stale: boolean;
};

export type BillingTransactionRow = {
  id: string;
  stripeInvoiceId: string;
  amountPaid: number;
  currency: string;
  status: string;
  paidAt: string | null;
  description: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
};

export interface BillingSubscriptionResponse {
  success: boolean;
  subscription: BillingSubscriptionDto;
}

export interface BillingCheckoutSessionBody {
  planKey: BillingPaidPlanKey;
}

export interface BillingVerifyCheckoutBody {
  sessionId: string;
}

export interface BillingTransactionsResponse {
  success: boolean;
  transactions: BillingTransactionRow[];
  page: number;
  totalPages: number;
}
