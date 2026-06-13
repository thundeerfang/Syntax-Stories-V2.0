import type Stripe from 'stripe';
import mongoose from 'mongoose';
import { getStripe } from './stripeClient.js';
import { applyStripeSubscription } from '../billing/applyStripeSubscription.js';
import { upsertLedgerFromStripeInvoice } from '../billing/ledger.service.js';
import { CheckoutIntentModel } from '../../models/CheckoutIntent.js';
import { UserModel } from '../../models/User.js';
import { sendAuthEmail, isAuthEmailConfigured } from '../../infrastructure/mail/sendAuthEmail.js';
import { SEVEN_DAYS_MS } from '../../constants/durations.js';

function graceUntilFromInvoice(invoice: Stripe.Invoice): Date {
  const npt = invoice.next_payment_attempt;
  if (npt) return new Date(npt * 1000);
  return new Date(Date.now() + SEVEN_DAYS_MS);
}

async function resolveUserIdForCustomer(
  customerId: string
): Promise<mongoose.Types.ObjectId | null> {
  const u = await UserModel.findOne({ stripeCustomerId: customerId });
  return u?._id ?? null;
}

export async function dispatchStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') return;

      const sessionId = session.id;
      const intent = await CheckoutIntentModel.findOne({ stripeCheckoutSessionId: sessionId });
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

      if (!customerId || !subscriptionId) return;

      let userId: mongoose.Types.ObjectId | null = null;
      if (intent?.userId) {
        userId = intent.userId;
        await UserModel.findByIdAndUpdate(intent.userId, {
          $set: { stripeCustomerId: customerId },
        });
      } else {
        userId = await resolveUserIdForCustomer(customerId);
      }

      if (!userId) {
        console.warn('[stripe webhook] checkout.session.completed: could not resolve user');
        return;
      }

      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
      });
      await applyStripeSubscription(sub, {
        source: 'webhook',
        stripeSignalCreated: event.created,
      });
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subObj = event.data.object as Stripe.Subscription;
      await applyStripeSubscription(subObj, {
        source: 'webhook',
        stripeSignalCreated: event.created,
      });
      break;
    }

    case 'invoice.paid':
    case 'invoice.finalized':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (!customerId) return;

      const userId = await resolveUserIdForCustomer(customerId);
      if (!userId) {
        console.warn('[stripe webhook] invoice event: no user for customer', customerId);
        return;
      }

      if (event.type === 'invoice.paid' || event.type === 'invoice.finalized') {
        await upsertLedgerFromStripeInvoice(invoice, userId);
      }

      const subRef =
        typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      if (subRef) {
        const sub = await stripe.subscriptions.retrieve(subRef, {
          expand: ['items.data.price'],
        });
        if (event.type === 'invoice.paid') {
          await applyStripeSubscription(sub, {
            source: 'webhook',
            stripeSignalCreated: event.created,
            graceUntil: null,
          });
        } else if (event.type === 'invoice.payment_failed') {
          const g = graceUntilFromInvoice(invoice);
          await applyStripeSubscription(sub, {
            source: 'webhook',
            stripeSignalCreated: event.created,
            graceUntil: g,
          });
          const user = await UserModel.findById(userId);
          if (user?.email && isAuthEmailConfigured()) {
            try {
              await sendAuthEmail({
                to: user.email,
                subject: 'Payment failed — update your billing method',
                html: `<p>We could not process a payment for your Syntax Stories subscription.</p>
                <p>Please update your payment method in the billing portal to keep your access.</p>`,
              });
            } catch (e) {
              console.warn('[stripe webhook] payment failed email skipped', e);
            }
          }
        } else {
          await applyStripeSubscription(sub, {
            source: 'webhook',
            stripeSignalCreated: event.created,
          });
        }
      }
      break;
    }

    default:
      break;
  }
}
