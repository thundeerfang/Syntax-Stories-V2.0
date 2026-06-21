"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  createCheckoutSession,
  fetchBillingPlans,
  type BillingPaidPlanKey,
  type BillingPlanCatalogItem,
} from "@/api/billing";
import { useAuthStore } from "@/store/auth";
import { BlockShadowButton } from "@/components/ui";
import { PricingPlansGridSkeleton } from "@/components/skeletons";
import { shell } from "@/lib/styles";
import { cn } from "@/lib/core/utils";

function PlanCheckoutButton({
  planKey,
  checkoutEnabled,
  planName,
}: {
  planKey: BillingPaidPlanKey;
  checkoutEnabled: boolean;
  planName: string;
}) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    if (!checkoutEnabled) {
      toast.error("Checkout is not configured for this plan yet.");
      return;
    }
    if (!token) {
      window.location.href = `/login?next=${encodeURIComponent("/pricing")}`;
      return;
    }
    setBusy(true);
    try {
      const url = await createCheckoutSession(token, planKey);
      window.location.href = url;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [token, planKey, checkoutEnabled]);

  const label = token ? "Continue to checkout" : "Sign in to subscribe";

  return (
    <BlockShadowButton
      variant="primary"
      size="lg"
      fullWidth
      disabled={busy || !isHydrated || !checkoutEnabled}
      aria-busy={busy}
      aria-label={busy ? "Opening checkout…" : `${label} — ${planName}`}
      className={cn(
        (!isHydrated || !checkoutEnabled) && "pointer-events-none opacity-60",
      )}
      onClick={() => void onClick()}
    >
      {busy ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      ) : null}
      {busy ? "Opening checkout…" : isHydrated ? label : "Loading…"}
    </BlockShadowButton>
  );
}

function PricingPlansGrid({ plans }: { plans: BillingPlanCatalogItem[] }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
      {plans.map((p, index) => (
        <article
          key={p.key}
          className={cn(
            "relative flex min-h-0 flex-col border-4 border-border bg-card text-card-foreground shadow",
            p.featured && "border-primary shadow",
            plans.length % 2 === 1 &&
              index === plans.length - 1 &&
              "md:col-span-2 xl:col-span-1",
          )}
        >
          {p.badge ? (
            <div className="absolute -top-3 left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap border-2 border-border bg-primary px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow">
              {p.badge}
            </div>
          ) : null}

          <div className="flex flex-1 flex-col gap-5 p-5 pt-8 sm:p-6 md:p-5 lg:p-6 xl:p-7">
            <div className="space-y-1 border-b-2 border-border pb-5 text-left">
              <h3 className="font-mono text-base font-black uppercase tracking-tight text-foreground sm:text-lg">
                {p.name}
              </h3>
              <p className="text-sm leading-snug text-muted-foreground md:text-[13px] lg:text-sm">
                {p.description}
              </p>
            </div>

            <div className="text-left">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                <span className="text-4xl font-black tabular-nums tracking-tight text-foreground md:text-[2.35rem] lg:text-[2.75rem]">
                  {p.amountDisplay}
                </span>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {p.cadence}
                </span>
              </p>
            </div>

            <ul className="flex flex-1 flex-col gap-3 text-left md:gap-2.5 lg:gap-3">
              {p.features.map((b) => (
                <li
                  key={b}
                  className="flex gap-3 text-sm leading-snug md:text-[13px] lg:text-sm"
                >
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center border-2 border-border bg-muted/40 text-primary shadow">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="text-foreground/95">{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto border-t-2 border-dashed border-border pt-5">
              <PlanCheckoutButton
                planKey={p.key}
                checkoutEnabled={p.checkoutEnabled}
                planName={p.name}
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function PricingPage() {
  const [plans, setPlans] = useState<BillingPlanCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchBillingPlans();
        if (!cancelled) setPlans(list);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={shell.contentRail}>
      <div className="w-full space-y-6 md:space-y-8">
        <header className="w-full">
          <nav
            className="mb-3 flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <ChevronRight
              className="size-3 shrink-0 opacity-35"
              strokeWidth={2.5}
              aria-hidden
            />
            <span className="text-foreground">Pricing</span>
          </nav>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
            Plans for every{" "}
            <span className="text-primary underline decoration-4 underline-offset-4 sm:decoration-6 sm:underline-offset-6">
              builder.
            </span>
          </h1>
        </header>

        <section aria-labelledby="pricing-plans-heading" className="space-y-6">
          <h2 id="pricing-plans-heading" className="sr-only">
            Subscription plans
          </h2>
          {loading ? (
            <PricingPlansGridSkeleton />
          ) : error ? (
            <p className="rounded border-2 border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </p>
          ) : plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No plans are available right now.
            </p>
          ) : (
            <PricingPlansGrid plans={plans} />
          )}
        </section>
      </div>
    </div>
  );
}
