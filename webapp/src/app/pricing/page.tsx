'use client';

import { useCallback, useState } from 'react';
import { Check, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { createCheckoutSession } from '@/api/billing';
import { useAuthStore } from '@/store/auth';
import { BlockShadowButton } from '@/components/ui';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { cn } from '@/lib/core/utils';

type PlanKey = 'pro' | 'proplus' | 'ultra';

type Plan = {
  key: PlanKey;
  name: string;
  blurb: string;
  price: string;
  cadence: string;
  bullets: readonly string[];
  featured?: boolean;
  badge?: string;
};

const PLANS: Plan[] = [
  {
    key: 'pro',
    name: 'Pro',
    blurb: 'For individuals shipping real work.',
    price: '₹500',
    cadence: 'per month',
    bullets: ['Full Syntax Stories experience', 'Priority roadmap input', 'Standard support'],
  },
  {
    key: 'proplus',
    name: 'Pro Plus',
    blurb: 'More headroom when you live in the editor.',
    price: '₹1,000',
    cadence: 'per month',
    bullets: ['Everything in Pro', 'Higher limits where it matters', 'Faster support'],
    featured: true,
    badge: 'Most popular',
  },
  {
    key: 'ultra',
    name: 'Ultra',
    blurb: 'Maximum limits and fastest help.',
    price: '₹1,500',
    cadence: 'per month',
    bullets: ['Everything in Pro Plus', 'Maximum platform limits', 'Premium support'],
  },
];

const PLAN_LABEL: Record<PlanKey, string> = {
  pro: 'Pro',
  proplus: 'Pro Plus',
  ultra: 'Ultra',
};

function PlanCheckoutButton({ planKey }: { planKey: PlanKey }) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    if (!token) {
      window.location.href = `/login?next=${encodeURIComponent('/pricing')}`;
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
  }, [token, planKey]);

  const label = token ? 'Continue to checkout' : 'Sign in to subscribe';

  return (
    <BlockShadowButton
      variant="primary"
      size="lg"
      fullWidth
      disabled={busy || !isHydrated}
      aria-busy={busy}
      aria-label={busy ? 'Opening checkout…' : `${label} — ${PLAN_LABEL[planKey]}`}
      className={cn(!isHydrated && 'pointer-events-none opacity-60')}
      onClick={() => void onClick()}
    >
      {busy ? <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden /> : null}
      {busy ? 'Opening checkout…' : isHydrated ? label : 'Loading…'}
    </BlockShadowButton>
  );
}

export default function PricingPage() {
  return (
    <div className={SHELL_CONTENT_RAIL_CLASS}>
      <div className="w-full space-y-6 md:space-y-8">
        <header className="w-full">
          <nav
            className="mb-3 flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="size-3 shrink-0 opacity-35" strokeWidth={2.5} aria-hidden />
            <span className="text-foreground">Pricing</span>
          </nav>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
            Plans for every{' '}
            <span className="text-primary underline decoration-4 underline-offset-4 sm:decoration-6 sm:underline-offset-6">
              builder.
            </span>
          </h1>
        </header>

        <section aria-labelledby="pricing-plans-heading" className="space-y-6">
          <h2 id="pricing-plans-heading" className="sr-only">
            Subscription plans
          </h2>
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3 md:gap-8">
            {PLANS.map((p) => (
              <article
                key={p.key}
                className={cn(
                  'relative flex min-h-0 flex-col border-4 border-border bg-card text-card-foreground shadow',
                  p.featured && 'border-primary shadow',
                )}
              >
                {p.badge ? (
                  <div className="absolute -top-3 left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap border-2 border-border bg-primary px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow">
                    {p.badge}
                  </div>
                ) : null}

                <div className="flex flex-1 flex-col gap-5 p-6 pt-8 sm:p-7">
                  <div className="space-y-1 border-b-2 border-border pb-5 text-left">
                    <h3 className="font-mono text-lg font-black uppercase tracking-tight text-foreground">{p.name}</h3>
                    <p className="text-sm leading-snug text-muted-foreground">{p.blurb}</p>
                  </div>

                  <div className="text-left">
                    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                      <span className="text-4xl font-black tabular-nums tracking-tight text-foreground md:text-[2.75rem]">
                        {p.price}
                      </span>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {p.cadence}
                      </span>
                    </p>
                  </div>

                  <ul className="flex flex-1 flex-col gap-3 text-left">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex gap-3 text-sm leading-snug">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center border-2 border-border bg-muted/40 text-primary shadow">
                          <Check className="size-3.5" strokeWidth={3} aria-hidden />
                        </span>
                        <span className="text-foreground/95">{b}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto border-t-2 border-dashed border-border pt-5">
                    <PlanCheckoutButton planKey={p.key} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
