import { apiUrl } from '@/lib/api';

export type BillingPlanCatalogItem = {
  key: 'pro' | 'proplus' | 'ultra';
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

export async function fetchBillingPlans(): Promise<BillingPlanCatalogItem[]> {
  const res = await fetch(apiUrl('/api/billing/plans'), { credentials: 'include' });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    plans?: BillingPlanCatalogItem[];
    message?: string;
  };
  if (!res.ok || !data.plans) {
    throw new Error(data.message || 'Failed to load subscription plans');
  }
  return data.plans;
}
