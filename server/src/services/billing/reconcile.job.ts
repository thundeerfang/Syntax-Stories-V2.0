import crypto from 'crypto';
import { env } from '../../config/env.js';
import { SubscriptionModel } from '../../models/Subscription.js';
import { UserModel } from '../../models/User.js';
import { getStripe } from '../stripe/stripeClient.js';
import { applyStripeSubscription } from './applyStripeSubscription.js';
import { BILLING_RECONCILE_AGE_MS } from '../../variable/constants.js';

function shardHit(userId: string, pct: number): boolean {
  const h = crypto.createHash('sha256').update(userId).digest()[0] ?? 0;
  return h % 100 < pct;
}

export function startReconcileJob(): void {
  const run = async () => {
    try {
    const stripe = getStripe();
    if (!stripe) return;
    const cutoff = new Date(Date.now() - BILLING_RECONCILE_AGE_MS);
    const candidates = await SubscriptionModel.find({
      stripeSubscriptionId: { $exists: true, $ne: null },
      $or: [{ lastReconciledAt: null }, { lastReconciledAt: { $lt: cutoff } }],
    })
      .limit(200)
      .lean();

    for (const sub of candidates) {
      const uid = String(sub.userId);
      if (!shardHit(uid, env.BILLING_RECONCILE_SHARD_PCT)) continue;
      try {
        const remote = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId as string);
        await applyStripeSubscription(remote, { source: 'reconcile' });
        await SubscriptionModel.updateOne(
          { _id: sub._id },
          { $set: { lastReconciledAt: new Date() } }
        );
        await UserModel.updateOne(
          { _id: sub.userId },
          { $set: { lastSubscriptionReconciledAt: new Date() } }
        );
      } catch (e) {
        console.warn('[billing reconcile] skip', sub.stripeSubscriptionId, e);
      }
    }
    } catch (e) {
      console.warn('[billing reconcile] run failed:', (e as Error).message);
    }
  };

  setInterval(() => {
    void run();
  }, env.BILLING_RECONCILE_INTERVAL_MS);
  void run();
}
