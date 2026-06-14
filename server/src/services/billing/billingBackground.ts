import { env } from "../../config/env.js";
import { warmStripeCatalogPrices } from "../stripe/stripePriceResolver.js";
import { startWebhookRetryWorker } from "./webhookRetry.worker.js";
import { startReconcileJob } from "./reconcile.job.js";
export function startBillingBackgroundJobs(): void {
  if (!env.STRIPE_SECRET_KEY) return;
  void warmStripeCatalogPrices();
  startWebhookRetryWorker();
  startReconcileJob();
}
