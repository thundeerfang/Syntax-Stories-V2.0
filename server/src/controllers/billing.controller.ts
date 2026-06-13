import type { Request, Response } from 'express';
import { z } from 'zod';
import { PAID_PLAN_KEYS } from '../variable/constants.js';
import type { AuthUser } from '../middlewares/auth/verifyToken.js';
import {
  createBillingPortalSession,
  createCheckoutSessionForUser,
} from '../services/stripe/checkout.service.js';
import { verifyCheckoutAndSync } from '../services/billing/verifyCheckout.service.js';
import { getSubscriptionForUser } from '../services/billing/getSubscriptionForUser.js';
import { listBillingPlanCatalog } from '../services/billing/planCatalog.js';
import { PaymentLedgerModel } from '../models/PaymentLedger.js';
import { syncPaymentLedgerFromStripe } from '../services/billing/ledger.service.js';

const planKeySchema = z.enum(PAID_PLAN_KEYS);
const verifyBodySchema = z.object({ sessionId: z.string().min(1) });

export async function getPlans(_req: Request, res: Response): Promise<void> {
  const plans = await listBillingPlanCatalog();
  res.json({ success: true, plans });
}

export async function postCheckoutSession(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: AuthUser }).user;
  const parsed = planKeySchema.safeParse(req.body?.planKey ?? req.body?.plan);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid planKey', success: false });
    return;
  }
  try {
    const { url } = await createCheckoutSessionForUser(user._id, parsed.data);
    res.json({ success: true, url });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    if (err.statusCode === 409) {
      res.status(409).json({ message: err.message, success: false });
      return;
    }
    console.error('[billing] checkout-session', e);
    res.status(500).json({ message: err.message || 'Checkout failed', success: false });
  }
}

export async function postVerifyCheckout(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: AuthUser }).user;
  const parsed = verifyBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'sessionId required', success: false });
    return;
  }
  try {
    const subscription = await verifyCheckoutAndSync(user._id, parsed.data.sessionId);
    res.json({ success: true, subscription });
  } catch (e) {
    const err = e as Error & { statusCode?: number };
    const code = err.statusCode ?? 500;
    res.status(code).json({ message: err.message, success: false });
  }
}

export async function postPortalSession(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: AuthUser }).user;
  try {
    const { url } = await createBillingPortalSession(user._id);
    res.json({ success: true, url });
  } catch (e) {
    console.error('[billing] portal-session', e);
    res.status(500).json({ message: (e as Error).message, success: false });
  }
}

export async function getSubscription(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: AuthUser }).user;
  const forceSync = req.query.forceSync === 'true';
  try {
    const subscription = await getSubscriptionForUser(user._id, { forceSync });
    res.json({ success: true, subscription });
  } catch (e) {
    res.status(500).json({ message: (e as Error).message, success: false });
  }
}

export async function getTransactions(req: Request, res: Response): Promise<void> {
  const user = (req as Request & { user: AuthUser }).user;
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(String(req.query.limit ?? '20'), 10) || 20)
  );
  const skip = (page - 1) * limit;

  const existingCount = await PaymentLedgerModel.countDocuments({ userId: user._id });
  const forceSync = req.query.sync === 'true';
  if (existingCount === 0 || forceSync) {
    try {
      await syncPaymentLedgerFromStripe(user._id);
    } catch (e) {
      console.warn('[billing] ledger sync from Stripe failed', e);
    }
  }

  const [rows, total] = await Promise.all([
    PaymentLedgerModel.find({ userId: user._id })
      .sort({ paidAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PaymentLedgerModel.countDocuments({ userId: user._id }),
  ]);

  res.json({
    success: true,
    page,
    limit,
    total,
    transactions: rows.map((r) => ({
      id: String(r._id),
      stripeInvoiceId: r.stripeInvoiceId,
      amountPaid: r.amountPaid,
      currency: r.currency,
      status: r.status,
      paidAt: r.paidAt?.toISOString() ?? null,
      description: r.description ?? r.lineSummary ?? '',
      hostedInvoiceUrl: r.hostedInvoiceUrl ?? null,
      invoicePdfUrl: r.invoicePdfUrl ?? null,
    })),
  });
}
