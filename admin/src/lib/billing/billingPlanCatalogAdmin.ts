import { adminAuthenticatedFetch } from '@/lib/auth/adminAuthenticatedFetch';

const MGMT = '/api/v1/admin/management';

export type AdminBillingPlanItem = {
  id: string;
  key: 'pro' | 'proplus' | 'ultra';
  name: string;
  description: string;
  amountDisplay: string;
  currency: string;
  amountMinor: number;
  cadence: string;
  features: string[];
  featured: boolean;
  badge: string | null;
  active: boolean;
  sortOrder: number;
  checkoutEnabled: boolean;
};

type AdminOk<T> = { success?: boolean; data?: T; error?: { message?: string }; message?: string };

function throwFrom(res: Response, json: AdminOk<unknown>): never {
  throw new Error(json.error?.message ?? json.message ?? `Request failed (${res.status})`);
}

export async function listAdminBillingPlans(token: string): Promise<AdminBillingPlanItem[]> {
  const res = await adminAuthenticatedFetch(`${MGMT}/billing-plans`, { token });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{ items: AdminBillingPlanItem[] }>;
  if (!res.ok || !json.success || !json.data?.items) throwFrom(res, json);
  return json.data.items;
}

export async function listAvailableBillingPlanKeys(
  token: string
): Promise<Array<'pro' | 'proplus' | 'ultra'>> {
  const res = await adminAuthenticatedFetch(`${MGMT}/billing-plans/available-keys`, { token });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{
    keys: Array<'pro' | 'proplus' | 'ultra'>;
  }>;
  if (!res.ok || !json.success || !json.data?.keys) throwFrom(res, json);
  return json.data.keys;
}

export async function createAdminBillingPlan(
  token: string,
  body: {
    key: 'pro' | 'proplus' | 'ultra';
    name: string;
    description: string;
    amountDisplay: string;
    amountMinor: number;
    cadence: string;
    features: string[];
    sortOrder?: number;
    active?: boolean;
    mostPopular?: boolean;
  }
): Promise<AdminBillingPlanItem> {
  const res = await adminAuthenticatedFetch(`${MGMT}/billing-plans`, {
    token,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{ item: AdminBillingPlanItem }>;
  if (!res.ok || !json.success || !json.data?.item) throwFrom(res, json);
  return json.data.item;
}

export async function patchAdminBillingPlan(
  token: string,
  id: string,
  body: Partial<{
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
): Promise<AdminBillingPlanItem> {
  const res = await adminAuthenticatedFetch(`${MGMT}/billing-plans/${encodeURIComponent(id)}`, {
    token,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{ item: AdminBillingPlanItem }>;
  if (!res.ok || !json.success || !json.data?.item) throwFrom(res, json);
  return json.data.item;
}

export async function deleteAdminBillingPlan(
  token: string,
  id: string
): Promise<{ id: string; deleted?: boolean; deactivated?: boolean; subscriptionCount?: number }> {
  const res = await adminAuthenticatedFetch(`${MGMT}/billing-plans/${encodeURIComponent(id)}`, {
    token,
    method: 'DELETE',
  });
  const json = (await res.json().catch(() => ({}))) as AdminOk<{
    id: string;
    deleted?: boolean;
    deactivated?: boolean;
    subscriptionCount?: number;
  }>;
  if (!res.ok || !json.success || !json.data) throwFrom(res, json);
  return json.data;
}
