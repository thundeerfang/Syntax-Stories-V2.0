import type { PaidPlanKey } from "../../models/CheckoutIntent.js";
import {
  getBillingPlanByKeyFromStore,
  listBillingPlanCatalogFromStore,
} from "./planCatalogStore.js";
export type BillingPlanCatalogItem = {
  key: PaidPlanKey;
  name: string;
  description: string;
  amountDisplay: string;
  currency: string;
  amountMinor: number;
  cadence: string;
  features: string[];
  featured?: boolean;
  badge?: string;
  checkoutEnabled: boolean;
};
export async function listBillingPlanCatalog(): Promise<
  BillingPlanCatalogItem[]
> {
  return listBillingPlanCatalogFromStore();
}
export async function getBillingPlanByKey(
  key: PaidPlanKey,
): Promise<BillingPlanCatalogItem | undefined> {
  return getBillingPlanByKeyFromStore(key);
}
