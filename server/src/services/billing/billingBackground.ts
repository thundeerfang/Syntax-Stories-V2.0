import { env } from '../../config/env.js';
import { warmStripeCatalogPrices } from '../stripe/stripePriceResolver.js';
import { startWebhookRetryWorker } from './webhookRetry.worker.js';
import { startReconcileJob } from './reconcile.job.js';

/** Webhook DLQ retry + throttled Stripe reconcile (§10.2, §4.4). */
export function startBillingBackgroundJobs(): void {
  if (!env.STRIPE_SECRET_KEY) return;
  void warmStripeCatalogPrices();
  startWebhookRetryWorker();
  startReconcileJob();
}
