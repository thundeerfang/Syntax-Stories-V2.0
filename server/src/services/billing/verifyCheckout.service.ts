import { UserModel } from '../../models/User.js';
import { CheckoutIntentModel } from '../../models/CheckoutIntent.js';
import { getStripe } from '../stripe/stripeClient.js';
import { applyStripeSubscription } from './applyStripeSubscription.js';
import { getSubscriptionForUser } from './getSubscriptionForUser.js';
import type { BillingSubscriptionDto } from './getSubscriptionForUser.js';

export async function verifyCheckoutAndSync(
  userId: string,
  sessionId: string
): Promise<BillingSubscriptionDto> {
  const intent = await CheckoutIntentModel.findOne({ stripeCheckoutSessionId: sessionId });
  if (!intent || String(intent.userId) !== userId) {
    const e = new Error('Forbidden');
    (e as Error & { statusCode?: number }).statusCode = 403;
    throw e;
  }
  if (intent.expiresAt.getTime() < Date.now()) {
    const e = new Error('Checkout session binding expired');
    (e as Error & { statusCode?: number }).statusCode = 403;
    throw e;
  }

  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer', 'subscription.items.data.price'],
  });

  if (session.mode !== 'subscription') {
    const e = new Error('Invalid checkout mode');
    (e as Error & { statusCode?: number }).statusCode = 400;
    throw e;
  }

  const customerId =
    typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);
  if (!customerId) {
    const e = new Error('Missing customer on session');
    (e as Error & { statusCode?: number }).statusCode = 400;
    throw e;
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    const e = new Error('User not found');
    (e as Error & { statusCode?: number }).statusCode = 404;
    throw e;
  }

  if (user.stripeCustomerId && user.stripeCustomerId !== customerId) {
    const e = new Error('Forbidden');
    (e as Error & { statusCode?: number }).statusCode = 403;
    throw e;
  }
  if (!user.stripeCustomerId) {
    await UserModel.findByIdAndUpdate(userId, { $set: { stripeCustomerId: customerId } });
  }

  const stripeSubRaw = session.subscription;
  if (!stripeSubRaw || typeof stripeSubRaw === 'string') {
    const e = new Error('Subscription not ready on session');
    (e as Error & { statusCode?: number }).statusCode = 400;
    throw e;
  }

  await applyStripeSubscription(stripeSubRaw, { source: 'verify' });
  return getSubscriptionForUser(userId, { forceSync: false });
}
