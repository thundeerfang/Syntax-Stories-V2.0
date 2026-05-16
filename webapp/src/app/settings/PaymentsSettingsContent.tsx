'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ExternalLink, CreditCard } from 'lucide-react';
import {
  createPortalSession,
  fetchBillingSubscription,
  fetchBillingTransactions,
  verifyCheckout,
  type BillingSubscriptionDto,
  type BillingTransactionRow,
} from '@/api/billing';
import { useSettingsAuthSlice } from '@/hooks/useSettingsAuthSlice';
import { SettingsSectionHeading, SettingsTabPanel, SettingsTabRoot } from './settings-list/SettingsSectionHeading';
import { ghostOutlineButtonClassNames } from '@/components/ui/button';
import { settingsBtnBlockPrimaryMd } from './buttonStyles';
import Link from 'next/link';


function formatInrMinorUnits(amount: number, currency: string): string {
  const cur = currency.toLowerCase();
  if (cur === 'inr') {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount / 100);
  }
  return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function statusLabel(sub: BillingSubscriptionDto): string {
  if (sub.isGraceActive) return 'Past due (grace)';
  if (sub.status === 'canceled') return 'Canceled';
  if (sub.status === 'past_due') return 'Past due';
  if (sub.cancelAtPeriodEnd) return 'Canceling at period end';
  if (sub.planKey === 'free') return 'Free';
  return sub.status === 'active' || sub.status === 'trialing' ? 'Active' : sub.status;
}

export function PaymentsSettingsContent() {
  const { token } = useSettingsAuthSlice();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sub, setSub] = useState<BillingSubscriptionDto | null>(null);
  const [tx, setTx] = useState<BillingTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [verifyDone, setVerifyDone] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        fetchBillingSubscription(token),
        fetchBillingTransactions(token, 1),
      ]);
      setSub(s);
      setTx(t.transactions);
    } catch (e) {
      toast.error((e as Error).message || 'Could not load billing');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');
    if (checkout !== 'success' || !sessionId || !token || verifyDone) return;
    (async () => {
      try {
        const s = await verifyCheckout(token, sessionId);
        setSub(s);
        toast.success('Subscription updated.');
        setVerifyDone(true);
        router.replace('/settings?section=payments', { scroll: false });
        void load();
      } catch (e) {
        toast.error((e as Error).message || 'Could not confirm checkout');
        setVerifyDone(true);
        router.replace('/settings?section=payments', { scroll: false });
      }
    })();
  }, [searchParams, token, verifyDone, router, load]);

  const openPortal = async () => {
    if (!token) return;
    setPortalLoading(true);
    try {
      const url = await createPortalSession(token);
      window.location.href = url;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading && !sub) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading billing…</span>
      </div>
    );
  }

  return (
    <SettingsTabRoot>
      <SettingsSectionHeading
        icon={<CreditCard />}
        title="Payments & subscription"
        description="Manage your Syntax Stories plan, renewal date, and invoices (Stripe)."
      />

      <SettingsTabPanel className="max-w-xl">
      <div className="grid gap-6">
        <div className="border-2 border-border bg-muted/10 p-4 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current plan</p>
          <p className="text-lg font-black">{sub?.planDisplayName ?? '—'}</p>
          <p className="text-sm text-muted-foreground">
            Status: <span className="font-semibold text-foreground">{sub ? statusLabel(sub) : '—'}</span>
          </p>
          {sub?.currentPeriodEnd ? (
            <p className="text-xs text-muted-foreground">
              {sub.cancelAtPeriodEnd ? 'Access until' : 'Renews or ends'}{' '}
              {new Date(sub.currentPeriodEnd).toLocaleString()}
            </p>
          ) : null}
          {sub?.isGraceActive ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Payment failed — update your card in the billing portal to restore full access.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" className={settingsBtnBlockPrimaryMd} onClick={() => void openPortal()} disabled={portalLoading}>
            {portalLoading ? <Loader2 className="size-4 animate-spin inline mr-2" /> : null}
            Manage billing
          </button>
          <Link href="/pricing" className={ghostOutlineButtonClassNames({ size: 'md' })}>
            Change plan
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Transactions</h3>
        {tx.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No invoices yet. After your first successful charge, receipts appear here.
          </p>
        ) : (
          <div className="overflow-x-auto border-2 border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b-2 border-border">
                <tr>
                  <th className="p-2 font-black text-[10px] uppercase tracking-wide">Date</th>
                  <th className="p-2 font-black text-[10px] uppercase tracking-wide">Description</th>
                  <th className="p-2 font-black text-[10px] uppercase tracking-wide">Amount</th>
                  <th className="p-2 font-black text-[10px] uppercase tracking-wide">Status</th>
                  <th className="p-2 font-black text-[10px] uppercase tracking-wide">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="p-2 whitespace-nowrap">
                      {row.paidAt ? new Date(row.paidAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-2 max-w-[200px] truncate">{row.description || row.stripeInvoiceId}</td>
                    <td className="p-2 whitespace-nowrap">{formatInrMinorUnits(row.amountPaid, row.currency)}</td>
                    <td className="p-2">{row.status}</td>
                    <td className="p-2">
                      {row.hostedInvoiceUrl ? (
                        <a
                          href={row.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                        >
                          View <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </SettingsTabPanel>
    </SettingsTabRoot>
  );
}
