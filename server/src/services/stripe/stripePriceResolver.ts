import type Stripe from 'stripe';
import { BillingPlanCatalogModel } from '../../models/BillingPlanCatalog.js';
import type { PaidPlanKey } from '../../variable/constants.js';
import { ALL_PAID_PLAN_KEYS } from '../../variable/constants.js';
import { env } from '../../config/env.js';
import { ensureDefaultBillingPlans } from '../billing/planCatalogStore.js';
import { isValidStripePriceId, planKeyToPriceId, priceIdToPlanKey } from '../billing/planConfig.js';
import { getStripe } from './stripeClient.js';

type CatalogRow = {
  key: PaidPlanKey;
  name: string;
  currency: string;
  amountMinor: number;
  stripePriceId?: string | null;
};

async function findProductByPlanKey(
  stripe: Stripe,
  planKey: PaidPlanKey
): Promise<Stripe.Product | null> {
  try {
    const result = await stripe.products.search({
      query: `active:'true' AND metadata['planKey']:'${planKey}'`,
      limit: 1,
    });
    return result.data[0] ?? null;
  } catch {
    const list = await stripe.products.list({ active: true, limit: 100 });
    return list.data.find((p) => p.metadata?.planKey === planKey) ?? null;
  }
}

async function findMatchingRecurringPrice(
  stripe: Stripe,
  productId: string,
  row: CatalogRow
): Promise<string | null> {
  const currency = row.currency.toLowerCase();
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const hit = prices.data.find(
    (p) =>
      p.type === 'recurring' &&
      p.recurring?.interval === 'month' &&
      p.currency === currency &&
      p.unit_amount === row.amountMinor
  );
  return hit?.id ?? null;
}

async function provisionStripePrice(row: CatalogRow): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).');

  let product = await findProductByPlanKey(stripe, row.key);
  if (!product) {
    product = await stripe.products.create({
      name: `Syntax Stories — ${row.name}`,
      description: `Syntax Stories ${row.name} — monthly software subscription`,
      metadata: { planKey: row.key, app: 'syntax-stories' },
    });
  }

  const existing = await findMatchingRecurringPrice(stripe, product.id, row);
  if (existing) {
    await BillingPlanCatalogModel.updateOne({ key: row.key }, { $set: { stripePriceId: existing } });
    return existing;
  }

  const price = await stripe.prices.create({
    product: product.id,
    currency: row.currency.toLowerCase(),
    unit_amount: row.amountMinor,
    recurring: { interval: 'month' },
    metadata: { planKey: row.key, app: 'syntax-stories' },
  });

  await stripe.products.update(product.id, { default_price: price.id });
  await BillingPlanCatalogModel.updateOne({ key: row.key }, { $set: { stripePriceId: price.id } });
  return price.id;
}

/** Resolve a Stripe Price id for checkout — env `price_*` wins, else catalog DB, else provision in Stripe. */
export async function resolvePlanStripePriceId(planKey: PaidPlanKey): Promise<string> {
  const fromEnv = planKeyToPriceId(planKey);
  if (isValidStripePriceId(fromEnv)) return fromEnv!;

  await ensureDefaultBillingPlans();
  const row = await BillingPlanCatalogModel.findOne({ key: planKey, active: true }).lean();
  if (!row) throw new Error(`Unknown plan: ${planKey}`);

  const stored = row.stripePriceId ?? undefined;
  if (isValidStripePriceId(stored)) return stored!;

  return provisionStripePrice({
    key: row.key as PaidPlanKey,
    name: row.name,
    currency: row.currency,
    amountMinor: row.amountMinor,
    stripePriceId: row.stripePriceId,
  });
}

/** Map Stripe Price id → plan key (env, then catalog). */
export async function resolvePlanKeyFromStripePriceId(
  priceId: string | undefined
): Promise<PaidPlanKey | null> {
  if (!priceId) return null;
  const fromEnv = priceIdToPlanKey(priceId);
  if (fromEnv) return fromEnv;

  const row = await BillingPlanCatalogModel.findOne({ stripePriceId: priceId }).lean();
  return (row?.key as PaidPlanKey | undefined) ?? null;
}

/** Warm catalog ↔ Stripe price links on startup (dev-friendly when env has display amounts). */
export async function warmStripeCatalogPrices(): Promise<void> {
  if (!env.STRIPE_SECRET_KEY) return;
  await ensureDefaultBillingPlans();
  const keys: PaidPlanKey[] = [...ALL_PAID_PLAN_KEYS];
  for (const key of keys) {
    try {
      const id = await resolvePlanStripePriceId(key);
      console.log(`[billing] Stripe price ready for ${key}: ${id}`);
    } catch (e) {
      console.warn(`[billing] Stripe price sync skipped for ${key}:`, (e as Error).message);
    }
  }
}
