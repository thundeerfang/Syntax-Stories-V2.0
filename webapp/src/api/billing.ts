import { resolvePublicApiBase } from '@/lib/publicApiBase';

const base = () => resolvePublicApiBase();

export type BillingPlanKey = 'free' | 'pro' | 'proplus' | 'ultra' | 'premium';

export type BillingSubscriptionDto = {
  planKey: BillingPlanKey;
  planDisplayName: string;
  status: string;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isGraceActive: boolean;
  graceUntil: string | null;
  lastSyncedAt: string | null;
  stale: boolean;
};

export type BillingTransactionRow = {
  id: string;
  stripeInvoiceId: string;
  amountPaid: number;
  currency: string;
  status: string;
  paidAt: string | null;
  description: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
};

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
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

export async function verifyCheckout(token: string, sessionId: string): Promise<BillingSubscriptionDto> {
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

export async function createCheckoutSession(token: string, planKey: 'pro' | 'proplus' | 'ultra'): Promise<string> {
  const res = await fetch(`${base()}/api/billing/checkout-session`, {
    method: 'POST',
    headers: authHeaders(token),
    credentials: 'include',
    body: JSON.stringify({ planKey }),
  });
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; url?: string; message?: string };
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
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; url?: string; message?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.message || 'Could not open billing portal');
  }
  return data.url;
}

export async function fetchBillingTransactions(
  token: string,
  page = 1
): Promise<{ transactions: BillingTransactionRow[]; total: number }> {
  const res = await fetch(`${base()}/api/billing/transactions?page=${page}&limit=20`, {
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
