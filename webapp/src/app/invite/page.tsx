'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserPlus,
  Copy,
  Check,
  Users,
  Link2,
  Sparkles,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';
import { setPostAuthRedirect } from '@/lib/auth/postAuthRedirect';
import { cn } from '@/lib/core/utils';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';


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

type ReferredRow = {
  id: string;
  username: string;
  fullName: string;
  profileImg: string;
  joinedAt: string | null;
  isActive: boolean;
};

type InviteReferredResponse = {
  success: boolean;
  total?: number;
  skip?: number;
  limit?: number;
  items?: ReferredRow[];
  message?: string;
};

const REFERRALS_PAGE_SIZE = 25;

export default function InviteDashboardPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const [me, setMe] = useState<InviteMeResponse | null>(null);
  const [stats, setStats] = useState<InviteStatsResponse | null>(null);
  const [referred, setReferred] = useState<ReferredRow[]>([]);
  const [referredTotal, setReferredTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [referredLoadingMore, setReferredLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referredError, setReferredError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'attach' | 'code' | null>(null);
  const [showAttachTip, setShowAttachTip] = useState(false);

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
    setReferredError(null);
    setLoading(true);
    try {
      const [meRes, statsRes, refRes] = await Promise.all([
        fetch(`${base}/api/invites/me`, {
          headers: { Authorization: `Bearer ${t}` },
          credentials: 'include',
        }),
        fetch(`${base}/api/invites/stats`, {
          headers: { Authorization: `Bearer ${t}` },
          credentials: 'include',
        }),
        fetch(`${base}/api/invites/referred?limit=${REFERRALS_PAGE_SIZE}&skip=0`, {
          headers: { Authorization: `Bearer ${t}` },
          credentials: 'include',
        }),
      ]);
      const meJson = (await meRes.json()) as InviteMeResponse;
      const statsJson = (await statsRes.json()) as InviteStatsResponse;
      const refJson = (await refRes.json()) as InviteReferredResponse;

      if (!meRes.ok || !meJson.success) {
        setError(meJson.message ?? 'Could not load your invite link.');
        setMe(null);
      } else {
        setMe(meJson);
      }
      if (statsRes.ok && statsJson.success) {
        setStats(statsJson);
      }
      if (refRes.ok && refJson.success && refJson.items) {
        setReferred(refJson.items);
        setReferredTotal(typeof refJson.total === 'number' ? refJson.total : refJson.items.length);
      } else {
        setReferred([]);
        setReferredTotal(0);
        if (!refRes.ok) {
          setReferredError(refJson.message ?? 'Could not load your referral list.');
        }
      }
    } catch {
      setError('Network error. Try again.');
      setMe(null);
      setReferred([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreReferred = useCallback(async () => {
    const t = useAuthStore.getState().token;
    const base = resolvePublicApiBase();
    if (!t || !base || referred.length >= referredTotal) return;
    setReferredLoadingMore(true);
    setReferredError(null);
    try {
      const skip = referred.length;
      const res = await fetch(
        `${base}/api/invites/referred?limit=${REFERRALS_PAGE_SIZE}&skip=${skip}`,
        {
          headers: { Authorization: `Bearer ${t}` },
          credentials: 'include',
        }
      );
      const json = (await res.json()) as InviteReferredResponse;
      if (!res.ok || !json.success || !json.items) {
        setReferredError(json.message ?? 'Could not load more.');
        return;
      }
      setReferred((prev) => [...prev, ...json.items!]);
    } catch {
      setReferredError('Network error loading more.');
    } finally {
      setReferredLoadingMore(false);
    }
  }, [referred.length, referredTotal]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      setPostAuthRedirect('/invite');
      router.replace('/login', '');
      return;
    }
    void load();
  }, [isHydrated, token, load, router]);

  const copyText = async (text: string, kind: 'link' | 'attach' | 'code') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  if (!isHydrated) {
    return (
      <div className={SHELL_CONTENT_RAIL_CLASS}>
        <div className="mx-auto max-w-2xl border-4 border-border bg-card px-6 py-12 text-center shadow">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground">Invite desk</p>
          <p className="mt-3 text-sm font-black uppercase tracking-wide text-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={SHELL_CONTENT_RAIL_CLASS}>
        <div className="mx-auto max-w-2xl border-4 border-border bg-card px-6 py-12 text-center shadow">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-muted-foreground">Invite desk</p>
          <p className="mt-3 text-sm font-black uppercase tracking-wide text-foreground">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  const converted = typeof stats?.converted === 'number' ? stats.converted : referredTotal;
  const hasMore = referred.length < referredTotal;

  return (
    <div className={SHELL_CONTENT_RAIL_CLASS}>
      <div className="w-full space-y-6 md:space-y-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)] xl:gap-10">
          <div className="min-w-0 space-y-6 md:space-y-8">
        {/* Big page header — panel card, not a navbar strip */}
        <div className="overflow-hidden border-4 border-border bg-card shadow">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-dashed border-border bg-muted/50 px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Radio className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span>Referral terminal</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">session · invite</span>
          </div>
          <div className="relative px-5 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 2px, var(--border) 2px, var(--border) 3px)',
              }}
              aria-hidden
            />
            <div className="relative">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground">Syntax stories</p>
              <h1 className="mt-2 text-3xl font-black uppercase italic leading-[0.95] tracking-tighter text-foreground sm:text-4xl md:text-5xl">
                Invite friends
              </h1>
              <p className="mt-5 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground md:text-base">
                This is your referral desk: copy your invite link or code, drop them in bios and DMs, and watch new
                builders land in your directory. Anyone who completes signup through your link or cookie-backed URL
                counts toward your totals below.
              </p>
              <ul className="mt-6 space-y-2 border-l-4 border-primary/50 pl-4 text-xs font-semibold text-foreground/90 md:text-sm">
                <li className="flex gap-2">
                  <span className="font-mono text-muted-foreground">01</span>
                  <span>Share the invite URL — it opens your public invite landing flow.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-muted-foreground">02</span>
                  <span>They sign up; you see them in the roster with join date and status.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-muted-foreground">03</span>
                  <span>Advanced: direct signup URL sets the referral cookie before redirect.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-4 border-border bg-card shadow">
          <div className="grid divide-y-4 divide-dashed divide-border sm:grid-cols-2 sm:divide-x-4 sm:divide-y-0">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 border-b-2 border-dashed border-border pb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" aria-hidden />
                Friends who joined
              </div>
              <p className="mt-4 text-4xl font-black tabular-nums tracking-tight text-foreground md:text-5xl">
                {loading ? '—' : converted}
              </p>
              <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Completed signups · attributed
              </p>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 border-b-2 border-dashed border-border pb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                Directory rows
              </div>
              <p className="mt-4 text-4xl font-black tabular-nums tracking-tight text-foreground md:text-5xl">
                {loading ? '—' : referredTotal}
              </p>
              <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {loading
                  ? '—'
                  : referred.length >= referredTotal
                    ? 'Full roster synced'
                    : `${referred.length} / ${referredTotal} loaded`}
              </p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="border-4 border-dashed border-border bg-muted/20 px-4 py-8 text-center shadow">
            <UserPlus className="mx-auto mb-3 size-8 text-muted-foreground/60" strokeWidth={2} aria-hidden />
            <p className="text-sm font-black uppercase tracking-wide text-muted-foreground">Pulling your links & roster…</p>
          </div>
        )}

        {error && !loading && (
          <p className="border-4 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive shadow">
            {error}
          </p>
        )}

        {!loading && me?.inviteUrl && (
            <section className="border-4 border-border bg-card shadow">
              <div className="border-b-4 border-border bg-muted/30 px-5 py-3 sm:px-6">
                <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-foreground">
                  <span className="flex size-8 items-center justify-center border-2 border-border bg-background shadow">
                    <Link2 className="size-4" aria-hidden />
                  </span>
                  Share &amp; copy
                </h2>
                <p className="mt-1 pl-10 font-mono text-[10px] text-muted-foreground">clipboard-ready fields</p>
              </div>
              <div className="space-y-6 p-5 sm:p-6 md:p-8">
            <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Invite URL (opens your invite landing page)
            </p>
            <div className="flex gap-2 break-all border-4 border-border bg-muted/25 px-3 py-3 font-mono text-xs leading-snug text-foreground shadow">
              <span className="min-w-0 flex-1">{me.inviteUrl}</span>
            </div>
            <button
              type="button"
              onClick={() => void copyText(me.inviteUrl!, 'link')}
              className="mt-4 flex w-full items-center justify-center gap-2 border-4 border-border bg-primary py-3 text-[10px] font-black uppercase tracking-[0.15em] text-primary-foreground shadow transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow active:translate-x-1 active:translate-y-1 active:shadow-none sm:w-auto sm:px-10"
            >
              {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === 'link' ? 'Copied' : 'Copy invite URL'}
            </button>

            {me.referralCode && (
              <div className="mt-6 border-t-2 border-dashed border-border pt-6">
                <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  Referral code only
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="border-4 border-border bg-background px-3 py-2 font-mono text-sm font-bold tracking-widest shadow">
                    {me.referralCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyText(me.referralCode!, 'code')}
                    className="border-4 border-border bg-card px-4 py-2 text-[10px] font-black uppercase tracking-wide shadow transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                  >
                    {copied === 'code' ? 'Copied' : 'Copy code'}
                  </button>
                </div>
              </div>
            )}

            {me.attachUrl && (
              <div className="mt-6 border-t-2 border-dashed border-border pt-6">
                <button
                  type="button"
                  onClick={() => setShowAttachTip((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  <span>Direct signup URL (sets referral cookie)</span>
                  <ChevronRight
                    className={cn('h-4 w-4 shrink-0 transition-transform', showAttachTip && 'rotate-90')}
                    aria-hidden
                  />
                </button>
                {showAttachTip && (
                  <div className="mt-3 space-y-3">
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Use this when you want the referral to apply after redirect (e.g. email buttons). It sends people
                      through the API first, then to your app with the referral cookie set.
                    </p>
                    <div className="break-all border-4 border-border bg-muted/20 px-3 py-2.5 font-mono text-[10px] leading-snug text-foreground">
                      {me.attachUrl}
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyText(me.attachUrl!, 'attach')}
                      className="flex items-center justify-center gap-2 border-4 border-border bg-card px-4 py-2.5 text-[10px] font-black uppercase tracking-wide shadow transition-all hover:translate-x-px hover:translate-y-px hover:shadow-none"
                    >
                      {copied === 'attach' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied === 'attach' ? 'Copied' : 'Copy signup URL'}
                    </button>
                  </div>
                )}
              </div>
            )}
              </div>
            </section>
        )}
          </div>

          <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <section className="border-4 border-border bg-card shadow">
              <div className="border-b-4 border-border bg-muted/30 px-5 py-3 sm:px-6">
                <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-foreground">
                  <span className="flex size-8 items-center justify-center border-2 border-border bg-background shadow">
                    <Users className="size-4" aria-hidden />
                  </span>
                  Referral roster
                </h2>
                <p className="mt-1 pl-10 font-mono text-[10px] text-muted-foreground">
                  newest first · public fields only
                </p>
              </div>

              {referredError && (
                <p className="border-b-4 border-destructive/40 bg-destructive/5 px-4 py-2.5 text-xs font-semibold text-destructive sm:px-6">
                  {referredError}
                </p>
              )}

              {loading ? (
                <div className="space-y-3 px-4 py-10 sm:px-6">
                  <div className="h-10 w-full animate-pulse border-2 border-border bg-muted/40" />
                  <div className="h-10 w-full animate-pulse border-2 border-border bg-muted/30" />
                  <div className="h-10 w-full animate-pulse border-2 border-border bg-muted/20" />
                  <p className="text-center font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Syncing roster…
                  </p>
                </div>
              ) : referred.length === 0 && !referredLoadingMore ? (
                <div className="px-4 py-12 text-center sm:px-6">
                  <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" strokeWidth={1.5} aria-hidden />
                  <p className="text-sm font-bold text-foreground">No referrals yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                    When friends sign up using your link or code, they will show up in this table.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[280px] text-left text-sm">
                    <thead>
                      <tr className="border-b-4 border-border bg-muted/40 font-mono text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        <th className="px-3 py-2.5 sm:px-4">Member</th>
                        <th className="hidden px-3 py-2.5 sm:table-cell sm:px-4">Joined</th>
                        <th className="px-3 py-2.5 text-right sm:px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referred.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b-2 border-dashed border-border/70 last:border-0 odd:bg-muted/15"
                        >
                          <td className="px-3 py-3 sm:px-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <img
                                src={row.profileImg}
                                alt=""
                                className="h-10 w-10 shrink-0 border-2 border-border object-cover"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-bold text-foreground">{row.fullName}</p>
                                <Link
                                  href={`/u/${encodeURIComponent(row.username)}`}
                                  className="text-[11px] font-black uppercase tracking-wide text-primary hover:underline"
                                >
                                  @{row.username}
                                </Link>
                                <p className="mt-0.5 text-[10px] text-muted-foreground sm:hidden">
                                  {row.joinedAt
                                    ? new Date(row.joinedAt).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })
                                    : '—'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-muted-foreground sm:table-cell sm:px-4">
                            {row.joinedAt
                              ? new Date(row.joinedAt).toLocaleString(undefined, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })
                              : '—'}
                          </td>
                          <td className="px-3 py-3 text-right sm:px-4">
                            <span
                              className={cn(
                                'inline-block border-4 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow',
                                row.isActive
                                  ? 'border-primary/40 bg-primary/10 text-primary'
                                  : 'border-border bg-muted text-muted-foreground'
                              )}
                            >
                              {row.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && hasMore && (
                <div className="border-t-4 border-dashed border-border bg-muted/10 p-4 sm:px-6">
                  <button
                    type="button"
                    onClick={() => void loadMoreReferred()}
                    disabled={referredLoadingMore}
                    className="w-full border-4 border-border bg-background py-3 text-[10px] font-black uppercase tracking-[0.2em] text-foreground shadow transition-all hover:bg-muted/30 hover:translate-x-px hover:translate-y-px hover:shadow disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow sm:w-auto sm:px-12"
                  >
                    {referredLoadingMore ? 'Loading…' : `Load more (${referredTotal - referred.length} left)`}
                  </button>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
