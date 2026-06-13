import { resolvePublicApiBase } from '@/lib/api/publicApiBase';

const base = () => resolvePublicApiBase();

export type {
  BillingPaidPlanKey,
  BillingPlanCatalogItem,
  BillingPlanKey,
  BillingSubscriptionDto,
  BillingTransactionRow,
} from '@contracts/billingApi';
import type {
  BillingPaidPlanKey,
  BillingPlanCatalogItem,
  BillingSubscriptionDto,
  BillingTransactionRow,
} from '@contracts/billingApi';

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchBillingPlans(): Promise<BillingPlanCatalogItem[]> {
  const res = await fetch(`${base()}/api/billing/plans`, { credentials: 'include' });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    plans?: BillingPlanCatalogItem[];
    message?: string;
  };
  if (!res.ok || !data.plans) {
    throw new Error(data.message || 'Failed to load plans');
  }
  return data.plans;
}

export async function fetchBillingSubscription(
  token: string,
  opts?: { forceSync?: boolean }
): Promise<BillingSubscriptionDto> {
  const q = opts?.forceSync ? '?forceSync=true' : '';
  const res = await fetch(`${base()}/api/billing/subscription${q}`, {
    headers: authHeaders(token),
    credentials: 'include',
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    subscription?: BillingSubscriptionDto;
    message?: string;
  };
  if (!res.ok || !data.subscription) {
    throw new Error(data.message || 'Failed to load subscription');
  }
  return data.subscription;
}

export async function verifyCheckout(
  token: string,
  sessionId: string
): Promise<BillingSubscriptionDto> {
  const res = await fetch(`${base()}/api/billing/verify-checkout`, {
    method: 'POST',
    headers: authHeaders(token),
    credentials: 'include',
    body: JSON.stringify({ sessionId }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    subscription?: BillingSubscriptionDto;
    message?: string;
  };
  if (!res.ok || !data.subscription) {
    throw new Error(data.message || 'Verify checkout failed');
  }
  return data.subscription;
}

export async function createCheckoutSession(
  token: string,
  planKey: BillingPaidPlanKey
): Promise<string> {
  const res = await fetch(`${base()}/api/billing/checkout-session`, {
    method: 'POST',
    headers: authHeaders(token),
    credentials: 'include',
    body: JSON.stringify({ planKey }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    url?: string;
    message?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(data.message || 'Could not start checkout');
  }
  return data.url;
}

export async function createPortalSession(token: string): Promise<string> {
  const res = await fetch(`${base()}/api/billing/portal-session`, {
    method: 'POST',
    headers: authHeaders(token),
    credentials: 'include',
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    url?: string;
    message?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(data.message || 'Could not open billing portal');
  }
  return data.url;
}

export async function fetchBillingTransactions(
  token: string,
  page = 1,
  opts?: { sync?: boolean }
): Promise<{ transactions: BillingTransactionRow[]; total: number }> {
  const syncQ = opts?.sync ? '&sync=true' : '';
  const res = await fetch(`${base()}/api/billing/transactions?page=${page}&limit=20${syncQ}`, {
    headers: authHeaders(token),
    credentials: 'include',
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    transactions?: BillingTransactionRow[];
    total?: number;
    message?: string;
  };
  if (!res.ok || !data.transactions) {
    throw new Error(data.message || 'Failed to load transactions');
  }
  return { transactions: data.transactions, total: data.total ?? 0 };
}
