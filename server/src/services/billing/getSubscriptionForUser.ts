import { env } from '../../config/env.js';
import { UserModel } from '../../models/User.js';
import { SubscriptionModel } from '../../models/Subscription.js';
import { getStripe } from '../stripe/stripeClient.js';
import {
  getCachedSubscriptionSummary,
  setCachedSubscriptionSummary,
} from './billingSummaryCache.js';
import { applyStripeSubscription } from './applyStripeSubscription.js';
import { computeIsGraceActive } from './entitlements.js';
import { normalizePlanForApi, planDisplayName } from './planConfig.js';
import type { SubscriptionPlan } from '../../models/Subscription.js';

export type BillingSubscriptionDto = {
  planKey: SubscriptionPlan;
  planDisplayName: string;
  status: string;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isGraceActive: boolean;
  graceUntil: string | null;
  lastSyncedAt: string | null;
  /** True when Mongo projection is older than threshold or caller asked for sync. */
  stale: boolean;
};

function isStale(lastSyncedAt: Date | undefined): boolean {
  if (!lastSyncedAt) return true;
  const ageSec = (Date.now() - lastSyncedAt.getTime()) / 1000;
  return ageSec > env.BILLING_SYNC_STALE_SEC;
}

export async function getSubscriptionForUser(
  userId: string,
  opts?: { forceSync?: boolean }
): Promise<BillingSubscriptionDto> {
  const forceSync = !!opts?.forceSync;

  if (!forceSync) {
    const cached = await getCachedSubscriptionSummary(userId);
    if (cached) {
      try {
        return JSON.parse(cached) as BillingSubscriptionDto;
      } catch {
        // fall through
      }
    }
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const sub = user.subscription ? await SubscriptionModel.findById(user.subscription) : null;

  if (!sub) {
    const empty: BillingSubscriptionDto = {
      planKey: 'free',
      planDisplayName: 'Free',
      status: 'active',
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isGraceActive: false,
      graceUntil: null,
      lastSyncedAt: null,
      stale: false,
    };
    await setCachedSubscriptionSummary(userId, JSON.stringify({ ...empty, stale: false }));
    return empty;
  }

  let dtoStale = isStale(sub.lastSyncedAt) || forceSync;
  const stripe = getStripe();

  if (
    stripe &&
    sub.stripeSubscriptionId &&
    (dtoStale || sub.status === 'incomplete' || sub.status === 'past_due' || forceSync)
  ) {
    try {
      const remote = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      await applyStripeSubscription(remote, { source: 'sync' });
      dtoStale = false;
    } catch (e) {
      console.warn('[billing] sync from Stripe failed', e);
    }
  }

  const refreshed = await SubscriptionModel.findById(sub._id);
  const s = refreshed ?? sub;

  const planKey = normalizePlanForApi(s.plan);
  const graceUntil = s.graceUntil ?? null;
  const isGraceActive = computeIsGraceActive(s.status, graceUntil);

  const dto: BillingSubscriptionDto = {
    planKey,
    planDisplayName: planDisplayName(planKey),
    status: s.status,
    stripeSubscriptionId: s.stripeSubscriptionId ?? null,
    currentPeriodEnd: s.currentPeriodEnd ? s.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: !!s.cancelAtPeriodEnd,
    isGraceActive,
    graceUntil: graceUntil ? graceUntil.toISOString() : null,
    lastSyncedAt: s.lastSyncedAt ? s.lastSyncedAt.toISOString() : null,
    stale: dtoStale,
  };

  await setCachedSubscriptionSummary(userId, JSON.stringify({ ...dto, stale: false }));
  return dto;
}
