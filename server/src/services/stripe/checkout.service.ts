import type Stripe from 'stripe';
import type { IUser } from '../../models/User.js';
import { UserModel } from '../../models/User.js';
import { SubscriptionModel } from '../../models/Subscription.js';
import { CheckoutIntentModel, type PaidPlanKey } from '../../models/CheckoutIntent.js';
import { env } from '../../config/env.js';
import { getStripe, isStripeConfigured } from './stripeClient.js';
import { planDisplayName } from '../billing/planConfig.js';
import { resolvePlanStripePriceId } from './stripePriceResolver.js';
import { CHECKOUT_INTENT_TTL_MS } from '../../variable/constants.js';

/** Bump when Checkout Session params change — avoids Stripe idempotency clashes after deploys. */
const CHECKOUT_IDEMPOTENCY_VERSION = 'in-export-v1';

function customerDisplayName(user: IUser): string {
  const name = user.fullName?.trim();
  if (name) return name;
  const username = user.username?.trim();
  if (username) return username;
  const emailLocal = user.email?.split('@')[0]?.trim();
  return emailLocal || 'Syntax Stories customer';
}

function hourBucket(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}-${d.getUTCHours()}`;
}

function checkoutIdempotencyKey(
  userId: string,
  planKey: PaidPlanKey,
  priceId: string
): string {
  return `checkout:${CHECKOUT_IDEMPOTENCY_VERSION}:${userId}:${planKey}:${priceId}:${hourBucket()}`;
}

function paidActive(status: string): boolean {
  return status === 'active' || status === 'trialing';
}

export async function ensureStripeCustomer(user: IUser): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');

  const name = customerDisplayName(user);

  if (user.stripeCustomerId) {
    const existing = await stripe.customers.retrieve(user.stripeCustomerId);
    if (!('deleted' in existing && existing.deleted)) {
      const c = existing as Stripe.Customer;
      if (!c.name?.trim() && name) {
        await stripe.customers.update(c.id, { name });
      }
      return c.id;
    }
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name,
    metadata: { appUserId: String(user._id) },
  });
  await UserModel.findByIdAndUpdate(user._id, { $set: { stripeCustomerId: customer.id } });
  return customer.id;
}

export async function createCheckoutSessionForUser(
  userId: string,
  planKey: PaidPlanKey
): Promise<{ url: string }> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe billing is not fully configured (keys and price IDs).');
  }
  const stripe = getStripe()!;

  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');

  const subDoc = user.subscription ? await SubscriptionModel.findById(user.subscription) : null;
  if (subDoc?.stripeSubscriptionId && paidActive(subDoc.status)) {
    const err = new Error(
      'You already have an active subscription. Use the billing portal to change plans.'
    );
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  const priceId = await resolvePlanStripePriceId(planKey);

  const customerId = await ensureStripeCustomer(user);

  const base =
    env.PUBLIC_APP_URL ||
    env.FRONTEND_URL?.split(',')[0]?.replace(/\/$/, '') ||
    'http://localhost:3000';
  const successUrl = `${base}/settings?section=payments&checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${base}/pricing?checkout=canceled`;

  const planLabel = planDisplayName(planKey);
  const serviceDescription = `Syntax Stories ${planLabel} — monthly software subscription`;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    customer: customerId,
    client_reference_id: String(user._id),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    // India export compliance — name + billing address required on the Customer.
    billing_address_collection: 'required',
    customer_update: {
      address: 'auto',
      name: 'auto',
    },
    subscription_data: {
      metadata: { appUserId: String(user._id), planKey },
      description: serviceDescription,
    },
  };

  const idempotencyKey = checkoutIdempotencyKey(userId, planKey, priceId);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });
  } catch (e) {
    const err = e as Stripe.errors.StripeError;
    if (err.type === 'StripeIdempotencyError') {
      session = await stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey: `${idempotencyKey}:retry-${Date.now()}`,
      });
    } else {
      throw e;
    }
  }

  if (!session.url) {
    throw new Error('Checkout session missing redirect URL');
  }

  await CheckoutIntentModel.create({
    stripeCheckoutSessionId: session.id,
    userId: user._id,
    planKey,
    expiresAt: new Date(Date.now() + CHECKOUT_INTENT_TTL_MS),
  });

  return { url: session.url };
}

export async function createBillingPortalSession(userId: string): Promise<{ url: string }> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe billing is not fully configured.');
  }
  const stripe = getStripe()!;
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');
  const customerId = await ensureStripeCustomer(user);
  const base =
    env.PUBLIC_APP_URL ||
    env.FRONTEND_URL?.split(',')[0]?.replace(/\/$/, '') ||
    'http://localhost:3000';
  const returnUrl = env.STRIPE_PORTAL_RETURN_URL || `${base}/settings?section=payments`;

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  if (!portal.url) throw new Error('Portal session missing URL');
  return { url: portal.url };
}
