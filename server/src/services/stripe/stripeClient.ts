import Stripe from "stripe";
import { env } from "../../config/env.js";
let client: Stripe | null = null;
export function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true });
  }
  return client;
}
export function isStripeConfigured(): boolean {
  return !!env.STRIPE_SECRET_KEY;
}
