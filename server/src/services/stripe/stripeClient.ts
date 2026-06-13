import Stripe from 'stripe';
import { env } from '../../config/env.js';

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true });
  }
  return client;
}

export function isStripeConfigured(): boolean {
  return (
    !!env.STRIPE_SECRET_KEY &&
    !!env.STRIPE_PRICE_PRO &&
    !!env.STRIPE_PRICE_PROPLUS &&
    !!env.STRIPE_PRICE_ULTRA
  );
}
