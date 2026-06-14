"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  UserPlus,
  Copy,
  Check,
  Users,
  Link2,
  Hash,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useRouteRestoreNonce } from "@/hooks/useRouteRestore";
import { resolvePublicApiBase } from "@/lib/api/publicApiBase";
import { setPostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { cn } from "@/lib/core/utils";
import { shell } from "@/lib/styles";
import { BlockShadowButton } from "@/components/ui/button";
import { ShellPageIntroHeader, RailFeedEmptyState } from "@/components/layout";
import { InvitePageSkeletonInner } from "@/components/skeletons";
import { inviteApi, type InviteShareChannel } from "@/api/invite";

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
  pending?: number;
  rewarded?: number;
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
  items?: ReferredRow[];
  message?: string;
};

/** Max friends shown in the roster (fixed layout). */
const MAX_ROSTER = 10;

type CopyKind = "link" | "attach" | "code";

function CopyButton({
  label,
  copied,
  onCopy,
  primary,
}: {
  label: string;
  copied: boolean;
  onCopy: () => void;
  primary?: boolean;
}) {
  return (
    <BlockShadowButton
      type="button"
      variant={primary ? "primary" : "outline"}
      size="sm"
      onClick={onCopy}
      className="shrink-0 py-2.5"
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {copied ? "Copied" : label}
    </BlockShadowButton>
  );
}

function RosterRow({ row }: { row: ReferredRow }) {
  return (
    <li className="flex items-center gap-3 border-b-2 border-border/60 px-4 py-3 last:border-b-0 odd:bg-muted/10">
      <img
        src={row.profileImg}
        alt=""
        className="size-10 shrink-0 border-2 border-border object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">
          {row.fullName}
        </p>
        <Link
          href={`/u/${encodeURIComponent(row.username)}`}
          className="text-[11px] font-black uppercase tracking-wide text-primary hover:underline"
        >
          @{row.username}
        </Link>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-[10px] font-medium text-muted-foreground">
          {row.joinedAt
            ? new Date(row.joinedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—"}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 border-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
          row.isActive
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-muted text-muted-foreground",
        )}
      >
        {row.isActive ? "Active" : "Inactive"}
      </span>
    </li>
  );
}

export default function InviteDashboardPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const routeRestoreNonce = useRouteRestoreNonce();

  const [me, setMe] = useState<InviteMeResponse | null>(null);
  const [stats, setStats] = useState<InviteStatsResponse | null>(null);
  const [referred, setReferred] = useState<ReferredRow[]>([]);
  const [referredTotal, setReferredTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referredError, setReferredError] = useState<string | null>(null);
  const [copied, setCopied] = useState<CopyKind | null>(null);
  const [showAttach, setShowAttach] = useState(false);

  const load = useCallback(async () => {
    const t = useAuthStore.getState().token;
    if (!t) return;
    const base = resolvePublicApiBase();
    if (!base) {
      setError("API URL is not configured (NEXT_PUBLIC_API_BASE_URL).");
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
          credentials: "include",
        }),
        fetch(`${base}/api/invites/stats`, {
          headers: { Authorization: `Bearer ${t}` },
          credentials: "include",
        }),
        fetch(`${base}/api/invites/referred?limit=${MAX_ROSTER}&skip=0`, {
          headers: { Authorization: `Bearer ${t}` },
          credentials: "include",
        }),
      ]);
      const meJson = (await meRes.json()) as InviteMeResponse;
      const statsJson = (await statsRes.json()) as InviteStatsResponse;
      const refJson = (await refRes.json()) as InviteReferredResponse;

      if (!meRes.ok || !meJson.success) {
        setError(meJson.message ?? "Could not load your invite link.");
        setMe(null);
      } else {
        setMe(meJson);
      }
      if (statsRes.ok && statsJson.success) {
        setStats(statsJson);
      }
      if (refRes.ok && refJson.success && refJson.items) {
        setReferred(refJson.items.slice(0, MAX_ROSTER));
        setReferredTotal(
          typeof refJson.total === "number"
            ? refJson.total
            : refJson.items.length,
        );
      } else {
        setReferred([]);
        setReferredTotal(0);
        if (!refRes.ok) {
          setReferredError(
            refJson.message ?? "Could not load your referral list.",
          );
        }
      }
    } catch {
      setError("Network error. Try again.");
      setMe(null);
      setReferred([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      setPostAuthRedirect("/invite");
      router.replace("/login");
      return;
    }
    void load();
  }, [isHydrated, token, load, router, routeRestoreNonce]);

  const copyText = async (text: string, kind: CopyKind, toastLabel: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast.success(toastLabel);
      setTimeout(() => setCopied(null), 2000);
      const channelMap: Record<CopyKind, InviteShareChannel> = {
        link: "copy_link",
        attach: "copy_attach",
        code: "copy_code",
      };
      const t = useAuthStore.getState().token;
      if (t) {
        void inviteApi
          .recordShare(t, channelMap[kind], me?.referralCode)
          .catch(() => undefined);
      }
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  if (!isHydrated || !token) {
    return <InvitePageSkeletonInner />;
  }

  if (loading) {
    return <InvitePageSkeletonInner />;
  }

  const converted =
    typeof stats?.converted === "number" ? stats.converted : referredTotal;
  const rosterFilled = referred.length;
  const emptySlots = Math.max(0, MAX_ROSTER - rosterFilled);

  return (
    <div className={cn(shell.contentRail, "flex min-h-0 flex-1 flex-col")}>
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <ShellPageIntroHeader
          breadcrumbItems={[
            { href: "/", label: "Home" },
            { label: "Invite friends" },
          ]}
          description="Share your link or code. Friends who complete signup through your URL count toward your roster below."
          title={
            <div className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center bg-foreground text-background shadow [&_svg]:size-7">
                <UserPlus aria-hidden />
              </span>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
                Invite{" "}
                <span className="text-primary underline decoration-4 underline-offset-4 sm:decoration-6 sm:underline-offset-6">
                  friends.
                </span>
              </h1>
            </div>
          }
        />

        {/* Share & copy + stats side-by-side */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] lg:items-stretch xl:gap-6">
          <section className="border-4 border-border bg-card shadow min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-border bg-muted/30 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center border-2 border-border bg-background shadow-sm">
                  <Link2 className="size-4 text-primary" aria-hidden />
                </span>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-foreground">
                    Share &amp; copy
                  </p>
                  <p className="text-[10px] font-medium text-muted-foreground">
                    Invite URL · code · direct signup link
                  </p>
                </div>
              </div>
              {me?.inviteUrl && (
                <CopyButton
                  primary
                  label="Copy invite link"
                  copied={copied === "link"}
                  onCopy={() =>
                    void copyText(me.inviteUrl!, "link", "Invite link copied")
                  }
                />
              )}
            </div>

            <div className="space-y-5 p-4 sm:p-5 md:p-6">
              {error && (
                <p className="border-2 border-destructive bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
                  {error}
                </p>
              )}

              {me?.inviteUrl && (
                <>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <Link2 className="size-3.5" aria-hidden />
                      Invite URL
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                      <div className="min-w-0 flex-1 break-all border-2 border-border bg-muted/20 px-3 py-2.5 font-mono text-xs leading-snug text-foreground">
                        {me.inviteUrl}
                      </div>
                      <CopyButton
                        label="Copy URL"
                        copied={copied === "link"}
                        onCopy={() =>
                          void copyText(
                            me.inviteUrl!,
                            "link",
                            "Invite link copied",
                          )
                        }
                      />
                    </div>
                  </div>

                  {me.referralCode && (
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <Hash className="size-3.5" aria-hidden />
                        Referral code
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="border-2 border-border bg-background px-4 py-2 font-mono text-sm font-bold tracking-widest shadow-sm">
                          {me.referralCode}
                        </code>
                        <CopyButton
                          label="Copy code"
                          copied={copied === "code"}
                          onCopy={() =>
                            void copyText(
                              me.referralCode!,
                              "code",
                              "Referral code copied",
                            )
                          }
                        />
                      </div>
                    </div>
                  )}

                  {me.attachUrl && (
                    <div className="border-t-2 border-dashed border-border pt-4">
                      <button
                        type="button"
                        onClick={() => setShowAttach((v) => !v)}
                        className="flex w-full items-center justify-between gap-2 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                      >
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="size-3.5" aria-hidden />
                          Direct signup URL (sets referral cookie)
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            showAttach && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                      {showAttach && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            For email buttons or deep links — hits the API
                            first, then redirects with your referral cookie set.
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                            <div className="min-w-0 flex-1 break-all border-2 border-border bg-muted/15 px-3 py-2 font-mono text-[10px] leading-snug">
                              {me.attachUrl}
                            </div>
                            <CopyButton
                              label="Copy signup URL"
                              copied={copied === "attach"}
                              onCopy={() =>
                                void copyText(
                                  me.attachUrl!,
                                  "attach",
                                  "Signup URL copied",
                                )
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-3 lg:min-h-full">
            <div className="border-4 border-border bg-card p-4 shadow-sm flex-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Users className="size-4 shrink-0 text-primary" aria-hidden />
                Friends joined
              </div>
              <p className="mt-2 text-3xl font-black tabular-nums text-foreground">
                {converted}
              </p>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                Completed signups
              </p>
            </div>
            <div className="border-4 border-border bg-card p-4 shadow-sm flex-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <UserPlus
                  className="size-4 shrink-0 text-primary"
                  aria-hidden
                />
                Roster slots
              </div>
              <p className="mt-2 text-3xl font-black tabular-nums text-foreground">
                {`${rosterFilled}/${MAX_ROSTER}`}
              </p>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                Shown in your directory
              </p>
            </div>
            <div className="border-4 border-border bg-card p-4 shadow-sm flex-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Sparkles
                  className="size-4 shrink-0 text-primary"
                  aria-hidden
                />
                Open slots
              </div>
              <p className="mt-2 text-3xl font-black tabular-nums text-foreground">
                {emptySlots}
              </p>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                Until roster is full
              </p>
            </div>
          </aside>
        </div>

        {/* Roster — fixed 10-row layout */}
        <section className="border-4 border-border bg-card shadow">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-border bg-muted/30 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center border-2 border-border bg-background shadow-sm">
                <Users className="size-4 text-primary" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-foreground">
                  Referral roster
                </p>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Newest first · max {MAX_ROSTER} shown
                </p>
              </div>
            </div>
            {referredTotal > MAX_ROSTER && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                +{referredTotal - MAX_ROSTER} more not shown
              </span>
            )}
          </div>

          {referredError && (
            <p className="border-b-2 border-destructive/30 bg-destructive/5 px-4 py-2 text-xs font-semibold text-destructive sm:px-5">
              {referredError}
            </p>
          )}

          {rosterFilled === 0 ? (
            <RailFeedEmptyState
              bordered={false}
              icon={Users}
              title="No referrals yet"
              description={`Copy your invite link above. Up to ${MAX_ROSTER} friends appear here after signup.`}
              className="py-14 sm:py-16"
            />
          ) : (
            <ul>
              {referred.map((row) => (
                <RosterRow key={row.id} row={row} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
