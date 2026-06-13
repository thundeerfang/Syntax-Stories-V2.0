import type { PaidPlanKey } from '../../models/CheckoutIntent.js';
import {
  getBillingPlanByKeyFromStore,
  listBillingPlanCatalogFromStore,
} from './planCatalogStore.js';

export type BillingPlanCatalogItem = {
  key: PaidPlanKey;
  name: string;
  /** Short marketing line (pricing card subtitle). */
  description: string;
  /** Display amount, e.g. `₹500`. */
  amountDisplay: string;
  currency: string;
  /** Minor units when known (paise for INR). */
  amountMinor: number;
  cadence: string;
  features: string[];
  featured?: boolean;
  badge?: string;
  /** Whether Stripe price id is configured for checkout. */
  checkoutEnabled: boolean;
};

export async function listBillingPlanCatalog(): Promise<BillingPlanCatalogItem[]> {
  return listBillingPlanCatalogFromStore();
}

export async function getBillingPlanByKey(key: PaidPlanKey): Promise<BillingPlanCatalogItem | undefined> {
  return getBillingPlanByKeyFromStore(key);
}
