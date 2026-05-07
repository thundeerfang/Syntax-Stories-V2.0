import type { SubscriptionStatus } from '../../models/Subscription.js';

/** §4.2 — recompute at read; do not trust a stored boolean alone. */
export function computeIsGraceActive(
  status: SubscriptionStatus | string,
  graceUntil: Date | null | undefined,
  now = new Date()
): boolean {
  return status === 'past_due' && !!graceUntil && graceUntil > now;
}
