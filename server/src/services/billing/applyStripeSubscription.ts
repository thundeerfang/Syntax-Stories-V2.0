import type { ClientSession } from 'mongoose';
import mongoose from 'mongoose';
import type Stripe from 'stripe';
import { UserModel } from '../../models/User.js';
import { SubscriptionModel, type ISubscription, type SubscriptionPlan } from '../../models/Subscription.js';
import { BillingAuditLogModel } from '../../models/BillingAuditLog.js';
import { getStripe } from '../stripe/stripeClient.js';
import { priceIdToPlanKey } from './planConfig.js';
import { withBillingLock } from './billingLock.js';
import { invalidateSubscriptionSummary } from './billingSummaryCache.js';

export type ApplySource = 'webhook' | 'verify' | 'sync' | 'reconcile';

export type ApplyStripeSubscriptionCtx = {
  source: ApplySource;
  /** Stripe webhook `event.created` (Unix seconds), when applicable. */
  stripeSignalCreated?: number;
  /** When set (including `null`), updates `graceUntil`; `undefined` leaves unchanged. */
  graceUntil?: Date | null;
};

function stripeCustomerId(sub: Stripe.Subscription): string | null {
  const c = sub.customer;
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && 'deleted' in c && (c as { deleted?: boolean }).deleted) return null;
  if (c && typeof c === 'object' && 'id' in c) return (c as Stripe.Customer).id;
  return null;
}

function mapStripeStatus(s: Stripe.Subscription.Status): ISubscription['status'] {
  const allowed = new Set([
    'active',
    'canceled',
    'past_due',
    'trialing',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused',
  ]);
  if (allowed.has(s as ISubscription['status'])) return s as ISubscription['status'];
  return 'canceled';
}

function planFromPriceId(priceId: string | undefined, fallback: SubscriptionPlan): SubscriptionPlan {
  const pk = priceIdToPlanKey(priceId);
  if (!pk) return fallback;
  return pk;
}

function snapshotSub(s: ISubscription) {
  return {
    plan: s.plan,
    status: s.status,
    currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    stripePriceId: s.stripePriceId ?? null,
  };
}

function isReplicaSetTransactionError(err: unknown): boolean {
  const e = err as { code?: number; codeName?: string; message?: string };
  if (e.code === 20) return true;
  if (e.codeName === 'IllegalOperation') return true;
  const m = e.message ?? '';
  return m.includes('replica set') || m.includes('Transaction numbers');
}

async function applyInSession(
  session: ClientSession | null,
  userId: mongoose.Types.ObjectId,
  subDocId: mongoose.Types.ObjectId,
  patch: Partial<ISubscription>,
  userPatch: Record<string, unknown>,
  audit: { action: string; source: ApplySource; before: unknown; after: unknown; stripeSubscriptionId: string } | null
): Promise<void> {
  const opts = session ? { session } : {};
  await SubscriptionModel.findByIdAndUpdate(subDocId, { $set: patch }, { ...opts });
  await UserModel.findByIdAndUpdate(userId, { $set: userPatch }, { ...opts });
  if (audit) {
    await BillingAuditLogModel.create(
      [
        {
          userId,
          action: audit.action,
          source: audit.source,
          stripeSubscriptionId: audit.stripeSubscriptionId,
          before: audit.before as Record<string, unknown>,
          after: audit.after as Record<string, unknown>,
        },
      ],
      opts
    );
  }
}

/**
 * Single writer for Stripe subscription → Mongo (+ user denorm + optional audit). §6.7
 */
export async function applyStripeSubscription(
  stripeSubscription: Stripe.Subscription,
  ctx: ApplyStripeSubscriptionCtx
): Promise<{ userId: string | null; updated: boolean }> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const subId = stripeSubscription.id;

  return withBillingLock(subId, async () => {
    const fresh = await stripe.subscriptions.retrieve(subId, {
      expand: ['items.data.price', 'customer'],
    });

    const customerId = stripeCustomerId(fresh);
    if (!customerId) {
      return { userId: null, updated: false };
    }

    const user = await UserModel.findOne({ stripeCustomerId: customerId });
    if (!user?._id) {
      console.warn('[billing] applyStripeSubscription: no user for customer', customerId);
      return { userId: null, updated: false };
    }

    let subDoc =
      (user.subscription && (await SubscriptionModel.findById(user.subscription))) ||
      (await SubscriptionModel.findOne({ userId: user._id }));

    if (!subDoc) {
      subDoc = await SubscriptionModel.create({
        userId: user._id,
        plan: 'free',
        status: 'active',
      });
      user.subscription = subDoc._id;
      await user.save();
    }

    const priceId = fresh.items.data[0]?.price?.id;
    const nextPlan = planFromPriceId(priceId, subDoc.plan);
    const nextStatus = mapStripeStatus(fresh.status);
    const cps = fresh.current_period_start ? new Date(fresh.current_period_start * 1000) : undefined;
    const cpe = fresh.current_period_end ? new Date(fresh.current_period_end * 1000) : undefined;
    const trialEnd = fresh.trial_end ? new Date(fresh.trial_end * 1000) : undefined;

    let graceUntil = subDoc.graceUntil ?? null;
    if (ctx.graceUntil !== undefined) {
      graceUntil = ctx.graceUntil;
    }

    const patch: Partial<ISubscription> = {
      stripeSubscriptionId: fresh.id,
      stripePriceId: priceId,
      plan: nextPlan,
      status: nextStatus,
      currentPeriodStart: cps,
      currentPeriodEnd: cpe,
      cancelAtPeriodEnd: !!fresh.cancel_at_period_end,
      trialEnd,
      lastSyncedAt: new Date(),
      source: 'stripe',
      version: (subDoc.version ?? 1) + 1,
      graceUntil,
    };

    if (ctx.stripeSignalCreated != null) {
      patch.lastAppliedStripeEventCreated = ctx.stripeSignalCreated;
    }

    const before = snapshotSub(subDoc);

    const same =
      subDoc.stripeSubscriptionId === patch.stripeSubscriptionId &&
      subDoc.stripePriceId === patch.stripePriceId &&
      subDoc.plan === patch.plan &&
      subDoc.status === patch.status &&
      subDoc.cancelAtPeriodEnd === patch.cancelAtPeriodEnd &&
      (subDoc.currentPeriodEnd?.getTime() ?? 0) === (patch.currentPeriodEnd?.getTime() ?? 0) &&
      (graceUntil?.getTime() ?? null) === (subDoc.graceUntil?.getTime() ?? null);

    if (same) {
      return { userId: String(user._id), updated: false };
    }

    const userPatch = {
      subscriptionStatus: patch.status,
      subscriptionPlanKey: patch.plan,
      subscriptionPeriodEnd: patch.currentPeriodEnd,
    };

    const audit =
      ctx.source === 'reconcile'
        ? {
            action: 'reconcile_fix',
            source: ctx.source,
            before,
            after: { ...before, ...patch },
            stripeSubscriptionId: fresh.id,
          }
        : {
            action: 'subscription_projection',
            source: ctx.source,
            before,
            after: { ...before, ...patch },
            stripeSubscriptionId: fresh.id,
          };

    const run = async (session: ClientSession | null) => {
      await applyInSession(session, user._id, subDoc!._id, patch, userPatch, audit);
    };

    const mongoSession = await mongoose.startSession();
    try {
      try {
        mongoSession.startTransaction();
        await run(mongoSession);
        await mongoSession.commitTransaction();
      } catch (inner) {
        await mongoSession.abortTransaction().catch(() => {});
        throw inner;
      }
    } catch (err) {
      if (isReplicaSetTransactionError(err)) {
        await run(null);
      } else {
        throw err;
      }
    } finally {
      await mongoSession.endSession();
    }

    await invalidateSubscriptionSummary(String(user._id));
    return { userId: String(user._id), updated: true };
  });
}
