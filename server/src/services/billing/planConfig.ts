import { env } from '../../config/env.js';
import type { PaidPlanKey } from '../../variable/constants.js';
import {
  normalizeSubscriptionPlan,
  subscriptionPlanDisplayName,
  type SubscriptionPlan,
} from '../../variable/constants.js';

/** Stripe Checkout requires a Price object id (`price_…`), not a display amount. */
export function isValidStripePriceId(id: string | undefined): boolean {
  return typeof id === 'string' && id.startsWith('price_');
}

export function priceIdToPlanKey(priceId: string | undefined): PaidPlanKey | null {
  if (!priceId) return null;
  if (priceId === env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === env.STRIPE_PRICE_PROPLUS) return 'proplus';
  if (priceId === env.STRIPE_PRICE_ULTRA) return 'ultra';
  return null;
}

export function planKeyToPriceId(planKey: PaidPlanKey): string | undefined {
  switch (planKey) {
    case 'pro':
      return env.STRIPE_PRICE_PRO || undefined;
    case 'proplus':
      return env.STRIPE_PRICE_PROPLUS || undefined;
    case 'ultra':
      return env.STRIPE_PRICE_ULTRA || undefined;
    default:
      return undefined;
  }
}

/** @deprecated Use `normalizeSubscriptionPlan` from `variable/constants`. */
export const normalizePlanForApi = normalizeSubscriptionPlan;

/** @deprecated Use `subscriptionPlanDisplayName` from `variable/constants`. */
export const planDisplayName = subscriptionPlanDisplayName;

export type { SubscriptionPlan };
