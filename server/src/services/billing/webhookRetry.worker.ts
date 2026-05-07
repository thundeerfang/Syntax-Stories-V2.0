import { env } from '../../config/env.js';
import { getStripe } from '../stripe/stripeClient.js';
import { StripeWebhookEventModel } from '../../models/StripeWebhookEvent.js';
import { dispatchStripeWebhookEvent } from '../stripe/webhook.service.js';

export function startWebhookRetryWorker(): void {
  const tick = async () => {
    const stripe = getStripe();
    if (!stripe) return;
    const now = new Date();
    const batch = await StripeWebhookEventModel.find({
      status: 'failed',
      nextRetryAt: { $lte: now },
      retryCount: { $lt: env.BILLING_WEBHOOK_MAX_RETRIES },
    })
      .sort({ nextRetryAt: 1 })
      .limit(20);

    for (const row of batch) {
      try {
        const evt = await stripe.events.retrieve(row.eventId);
        await dispatchStripeWebhookEvent(evt);
        await StripeWebhookEventModel.updateOne(
          { _id: row._id },
          { $set: { status: 'processed', lastError: undefined, nextRetryAt: undefined } }
        );
      } catch (e) {
        const msg = String((e as Error).message ?? e).slice(0, 2000);
        const retry = row.retryCount + 1;
        const nextRetryAt = new Date(Date.now() + 60_000 * Math.min(retry, 60));
        if (retry >= env.BILLING_WEBHOOK_MAX_RETRIES) {
          await StripeWebhookEventModel.updateOne(
            { _id: row._id },
            { $set: { status: 'dead', lastError: msg, retryCount: retry } }
          );
        } else {
          await StripeWebhookEventModel.updateOne(
            { _id: row._id },
            { $set: { status: 'failed', lastError: msg, retryCount: retry, nextRetryAt } }
          );
        }
      }
    }
  };

  setInterval(() => {
    void tick();
  }, env.BILLING_WEBHOOK_RETRY_MS);
  void tick();
}
