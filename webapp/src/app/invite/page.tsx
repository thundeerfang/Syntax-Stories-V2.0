'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Copy, Check, ArrowLeft, Users } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { resolvePublicApiBase } from '@/lib/publicApiBase';
import { setPostAuthRedirect } from '@/lib/postAuthRedirect';

type InviteMeResponse = {
  success: boolean;
  referralCode?: string;
  inviteUrl?: string;
  attachUrl?: string;
  message?: string;
};

type InviteStatsResponse = {
  success: boolean;
  converted?: number;
};

export default function InviteDashboardPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const [me, setMe] = useState<InviteMeResponse | null>(null);
  const [stats, setStats] = useState<InviteStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const t = useAuthStore.getState().token;
    if (!t) return;
    const base = resolvePublicApiBase();
    if (!base) {
      setError('API URL is not configured (NEXT_PUBLIC_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const [meRes, statsRes] = await Promise.all([
        fetch(`${base}/api/invites/me`, {
          headers: { Authorization: `Bearer ${t}` },
          credentials: 'include',
        }),
        fetch(`${base}/api/invites/stats`, {
          headers: { Authorization: `Bearer ${t}` },
          credentials: 'include',
        }),
      ]);
      const meJson = (await meRes.json()) as InviteMeResponse;
      const statsJson = (await statsRes.json()) as InviteStatsResponse;
      if (!meRes.ok || !meJson.success) {
        setError(meJson.message ?? 'Could not load your invite link.');
        setMe(null);
      } else {
        setMe(meJson);
      }
      if (statsRes.ok && statsJson.success) {
        setStats(statsJson);
      }
    } catch {
      setError('Network error. Try again.');
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      setPostAuthRedirect('/invite');
      router.replace('/login');
      return;
    }
    void load();
  }, [isHydrated, token, load, router]);

  const handleCopy = async () => {
    const text = me?.inviteUrl ?? me?.referralCode ?? '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm font-bold uppercase text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm font-bold uppercase text-muted-foreground">
        Redirecting to sign in…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back home
      </Link>

      <div className="border-2 border-border bg-card p-6 shadow-[6px_6px_0px_0px_var(--border)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center border-2 border-border bg-muted">
            <UserPlus className="h-6 w-6 text-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter text-foreground">Invite friends</h1>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Share your link — signups count toward your invites
            </p>
          </div>
        </div>

        {loading && (
          <p className="py-8 text-center text-sm font-bold uppercase text-muted-foreground">Loading your link…</p>
        )}

        {error && !loading && (
          <p className="rounded border-2 border-destructive bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {error}
          </p>
        )}

        {!loading && me?.inviteUrl && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                Your invite link
              </p>
              <div className="flex gap-2 break-all border-2 border-border bg-muted/30 px-3 py-2 font-mono text-xs text-foreground">
                <span className="min-w-0 flex-1">{me.inviteUrl}</span>
              </div>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-border bg-primary py-2.5 text-[10px] font-black uppercase tracking-wide text-primary-foreground shadow-[3px_3px_0px_0px_var(--border)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>

            {typeof stats?.converted === 'number' && (
              <div className="flex items-center gap-3 border-t-2 border-border pt-4">
                <Users className="h-5 w-5 text-muted-foreground" strokeWidth={2.5} />
                <div>
                  <p className="text-2xl font-black tabular-nums text-foreground">{stats.converted}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Friends who joined
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
