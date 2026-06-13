import type { PaidPlanKey } from '../../models/CheckoutIntent.js';
import { BillingPlanCatalogModel } from '../../models/BillingPlanCatalog.js';
import { SubscriptionModel } from '../../models/Subscription.js';
import { planKeyToPriceId } from './planConfig.js';
import type { BillingPlanCatalogItem } from './planCatalog.js';

export const ALL_PAID_PLAN_KEYS: PaidPlanKey[] = ['pro', 'proplus', 'ultra'];

const DEFAULT_PLANS: Array<{
  key: PaidPlanKey;
  name: string;
  description: string;
  amountDisplay: string;
  amountMinor: number;
  cadence: string;
  features: string[];
  featured: boolean;
  badge?: string | null;
  sortOrder: number;
}> = [
  {
    key: 'pro',
    name: 'Pro',
    description: 'For individuals shipping real work.',
    amountDisplay: '₹500',
    amountMinor: 50_000,
    cadence: 'per month',
    features: [
      'Full Syntax Stories experience',
      'Priority roadmap input',
      'Standard support',
    ],
    featured: false,
    badge: null,
    sortOrder: 0,
  },
  {
    key: 'proplus',
    name: 'Pro Plus',
    description: 'More headroom when you live in the editor.',
    amountDisplay: '₹1,000',
    amountMinor: 100_000,
    cadence: 'per month',
    features: ['Everything in Pro', 'Higher limits where it matters', 'Faster support'],
    featured: true,
    badge: 'Most popular',
    sortOrder: 1,
  },
  {
    key: 'ultra',
    name: 'Ultra',
    description: 'Maximum limits and fastest help.',
    amountDisplay: '₹1,500',
    amountMinor: 150_000,
    cadence: 'per month',
    features: ['Everything in Pro Plus', 'Maximum platform limits', 'Premium support'],
    featured: false,
    badge: null,
    sortOrder: 2,
  },
];

type PlanRow = {
  _id: { toString(): string };
  key: PaidPlanKey;
  name: string;
  description: string;
  amountDisplay: string;
  currency: string;
  amountMinor: number;
  cadence: string;
  features: string[];
  featured: boolean;
  badge?: string | null;
  sortOrder: number;
  active: boolean;
};

function mapPublic(row: PlanRow): BillingPlanCatalogItem {
  return {
    key: row.key,
    name: row.name,
    description: row.description,
    amountDisplay: row.amountDisplay,
    currency: row.currency,
    amountMinor: row.amountMinor,
    cadence: row.cadence,
    features: row.features ?? [],
    featured: row.featured || undefined,
    badge: row.badge ?? undefined,
    checkoutEnabled: Boolean(planKeyToPriceId(row.key)),
  };
}

export function mapAdminPlan(row: PlanRow) {
  return {
    id: String(row._id),
    ...mapPublic(row),
    featured: Boolean(row.featured),
    badge: row.badge ?? null,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

/** Seed Pro / Pro Plus / Ultra only when a slot is missing — never overwrite admin edits. */
export async function ensureDefaultBillingPlans(): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    await BillingPlanCatalogModel.updateOne(
      { key: plan.key },
      {
        $setOnInsert: {
          key: plan.key,
          name: plan.name,
          description: plan.description,
          amountDisplay: plan.amountDisplay,
          currency: 'INR',
          amountMinor: plan.amountMinor,
          cadence: plan.cadence,
          features: plan.features,
          featured: plan.featured,
          badge: plan.badge ?? null,
          sortOrder: plan.sortOrder,
          active: true,
        },
      },
      { upsert: true }
    );
  }
}

async function loadRows(activeOnly: boolean) {
  await ensureDefaultBillingPlans();
  const filter = activeOnly ? { active: true } : {};
  return BillingPlanCatalogModel.find(filter).sort({ sortOrder: 1, key: 1 }).lean();
}

export async function listBillingPlanCatalogFromStore(): Promise<BillingPlanCatalogItem[]> {
  const rows = await loadRows(true);
  return rows.map((r) => mapPublic(r as PlanRow));
}

export async function listBillingPlansAdminFromStore() {
  const rows = await loadRows(false);
  return rows.map((r) => mapAdminPlan(r as PlanRow));
}

export async function getBillingPlanByKeyFromStore(
  key: PaidPlanKey
): Promise<BillingPlanCatalogItem | undefined> {
  await ensureDefaultBillingPlans();
  const row = await BillingPlanCatalogModel.findOne({ key, active: true }).lean();
  return row ? mapPublic(row as PlanRow) : undefined;
}

export async function getAvailableBillingPlanKeysFromStore(): Promise<PaidPlanKey[]> {
  await ensureDefaultBillingPlans();
  const used = await BillingPlanCatalogModel.find({}).select('key').lean();
  const usedSet = new Set(used.map((r) => r.key as PaidPlanKey));
  return ALL_PAID_PLAN_KEYS.filter((k) => !usedSet.has(k));
}

export async function createBillingPlanInStore(input: {
  key: PaidPlanKey;
  name: string;
  description: string;
  amountDisplay: string;
  amountMinor: number;
  cadence: string;
  features: string[];
  sortOrder: number;
  active: boolean;
  mostPopular?: boolean;
}) {
  const exists = await BillingPlanCatalogModel.findOne({ key: input.key }).lean();
  if (exists) {
    throw new PlanCatalogStoreError(409, 'Plan key already exists', 'CONFLICT');
  }

  if (input.mostPopular) {
    await BillingPlanCatalogModel.updateMany(
      {},
      { $set: { featured: false, badge: null } }
    );
  }

  const doc = await BillingPlanCatalogModel.create({
    key: input.key,
    name: input.name,
    description: input.description,
    amountDisplay: input.amountDisplay,
    currency: 'INR',
    amountMinor: input.amountMinor,
    cadence: input.cadence,
    features: input.features,
    sortOrder: input.sortOrder,
    active: input.active,
    featured: Boolean(input.mostPopular),
    badge: input.mostPopular ? 'Most popular' : null,
  });

  return mapAdminPlan(doc.toObject() as PlanRow);
}

export async function updateBillingPlanInStore(
  id: string,
  patch: Partial<{
    name: string;
    description: string;
    amountDisplay: string;
    amountMinor: number;
    cadence: string;
    features: string[];
    sortOrder: number;
    active: boolean;
    mostPopular: boolean;
  }>
) {
  const doc = await BillingPlanCatalogModel.findById(id);
  if (!doc) throw new PlanCatalogStoreError(404, 'Plan not found', 'NOT_FOUND');

  if (patch.name !== undefined) doc.name = patch.name;
  if (patch.description !== undefined) doc.description = patch.description;
  if (patch.amountDisplay !== undefined) doc.amountDisplay = patch.amountDisplay;
  if (patch.amountMinor !== undefined) doc.amountMinor = patch.amountMinor;
  if (patch.cadence !== undefined) doc.cadence = patch.cadence;
  if (patch.features !== undefined) doc.features = patch.features;
  if (patch.sortOrder !== undefined) doc.sortOrder = patch.sortOrder;
  if (patch.active !== undefined) doc.active = patch.active;

  if (patch.mostPopular === true) {
    await BillingPlanCatalogModel.updateMany(
      { _id: { $ne: doc._id } },
      { $set: { featured: false, badge: null } }
    );
    doc.featured = true;
    doc.badge = 'Most popular';
  } else if (patch.mostPopular === false) {
    doc.featured = false;
    doc.badge = null;
  }

  await doc.save();
  return mapAdminPlan(doc.toObject() as PlanRow);
}

export async function deleteBillingPlanFromStore(id: string) {
  const doc = await BillingPlanCatalogModel.findById(id);
  if (!doc) throw new PlanCatalogStoreError(404, 'Plan not found', 'NOT_FOUND');

  const subs = await SubscriptionModel.countDocuments({
    plan: { $in: [doc.key, doc.key === 'ultra' ? 'premium' : doc.key] },
    status: { $in: ['active', 'trialing', 'past_due'] },
  });

  if (subs > 0) {
    doc.active = false;
    await doc.save();
    return { id, deactivated: true, subscriptionCount: subs };
  }

  await BillingPlanCatalogModel.findByIdAndDelete(id);
  return { id, deleted: true };
}

export class PlanCatalogStoreError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'PlanCatalogStoreError';
  }
}
