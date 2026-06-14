import type Stripe from "stripe";
import mongoose from "mongoose";
import {
  PaymentLedgerModel,
  type LedgerInvoiceStatus,
} from "../../models/PaymentLedger.js";
import { UserModel } from "../../models/User.js";
import { getStripe } from "../stripe/stripeClient.js";
import { invalidateSubscriptionSummary } from "./billingSummaryCache.js";
function mapInvoiceStatus(s: Stripe.Invoice.Status): LedgerInvoiceStatus {
  switch (s) {
    case "draft":
      return "draft";
    case "open":
      return "open";
    case "paid":
      return "paid";
    case "void":
      return "void";
    case "uncollectible":
      return "uncollectible";
    default:
      return "open";
  }
}
export async function upsertLedgerFromStripeInvoice(
  invoice: Stripe.Invoice,
  userId: mongoose.Types.ObjectId,
): Promise<void> {
  const stripeInvoiceId = invoice.id;
  if (!stripeInvoiceId) return;
  const amountPaid = invoice.amount_paid ?? 0;
  const currency = (invoice.currency ?? "inr").toLowerCase();
  const status = mapInvoiceStatus(invoice.status ?? "open");
  const paidAt =
    invoice.status_transitions?.paid_at != null
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : status === "paid" && invoice.created
        ? new Date(invoice.created * 1000)
        : undefined;
  const pi =
    typeof invoice.payment_intent === "string"
      ? invoice.payment_intent
      : invoice.payment_intent?.id;
  const charge =
    typeof invoice.charge === "string"
      ? invoice.charge
      : (invoice.charge?.id ?? undefined);
  const lineSummary =
    invoice.lines?.data
      ?.map((l) => l.description || l.plan?.nickname || "")
      .filter(Boolean)
      .slice(0, 3)
      .join(" · ") || undefined;
  await PaymentLedgerModel.findOneAndUpdate(
    { stripeInvoiceId },
    {
      $set: {
        userId,
        stripeInvoiceId,
        stripePaymentIntentId: pi,
        chargeId: charge,
        amountPaid,
        currency,
        status,
        paidAt,
        description: invoice.description ?? undefined,
        lineSummary,
        hostedInvoiceUrl: invoice.hosted_invoice_url ?? undefined,
        invoicePdfUrl: invoice.invoice_pdf ?? undefined,
      },
    },
    { upsert: true, new: true },
  );
  await invalidateSubscriptionSummary(String(userId));
}
export async function syncPaymentLedgerFromStripe(
  userId: string,
): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;
  const user = await UserModel.findById(userId)
    .select("stripeCustomerId")
    .lean();
  const customerId = user?.stripeCustomerId?.trim();
  if (!customerId) return;
  const userOid = new mongoose.Types.ObjectId(userId);
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const inv of page.data) {
      if (inv.status === "draft") continue;
      await upsertLedgerFromStripeInvoice(inv, userOid);
    }
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1]?.id;
    if (!startingAfter) break;
  }
}
