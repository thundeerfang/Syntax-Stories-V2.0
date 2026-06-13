import { env } from '../../config/env.js';
import type { PaidPlanKey } from '../../models/CheckoutIntent.js';
import type { SubscriptionPlan } from '../../models/Subscription.js';

const DISPLAY: Record<PaidPlanKey, string> = {
  pro: 'Pro',
  proplus: 'Pro Plus',
  ultra: 'Ultra',
};

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

/** Normalize legacy `premium` to `ultra` for API/UI. */
export function normalizePlanForApi(plan: SubscriptionPlan): SubscriptionPlan {
  if (plan === 'premium') return 'ultra';
  return plan;
}

export function planDisplayName(planKey: string | undefined): string {
  if (!planKey || planKey === 'free') return 'Free';
  const k = planKey === 'premium' ? 'ultra' : planKey;
  if (k === 'pro' || k === 'proplus' || k === 'ultra') return DISPLAY[k];
  return planKey;
}
