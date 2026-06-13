'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { GithubIcon, XIcon } from '@/components/icons/SocialProviderIcons';
import { RailFeedEmptyState } from '@/components/layout';
import {
  AboutPageLoadError,
  aboutPageUnavailableCopy,
  getAboutMarketingPage,
  type AboutMarketingPage,
  type AboutPageLoadReason,
} from '@/api/marketing';
import { MarketingIcon } from '@/lib/marketing/marketingIcons';
import { useAuthDialogStore } from '@/store/authDialog';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { cn } from '@/lib/core/utils';
import { fetchBillingPlans, type BillingPlanCatalogItem } from '@/api/billing';
import { BookOpen, CheckCircle2, Compass, Home } from 'lucide-react';

function AboutPageSkeleton() {
  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'animate-pulse space-y-16 py-8')}>
      <div className="h-12 w-48 bg-muted" />
      <div className="h-24 max-w-3xl bg-muted" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="h-64 border-2 border-border bg-muted/30 lg:col-span-7" />
        <div className="h-64 border-2 border-border bg-muted/30 lg:col-span-5" />
      </div>
    </div>
  );
}

function AboutPageUnavailable({
  reason,
  onRetry,
}: Readonly<{ reason: AboutPageLoadReason; onRetry: () => void }>) {
  const { title, description } = aboutPageUnavailableCopy(reason);
  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'py-12 md:py-16')}>
      <RailFeedEmptyState
        bordered={false}
        icon={BookOpen}
        title={title}
        description={description}
        className="py-16 sm:py-20"
        actions={[
          {
            label: 'Try again',
            onClick: onRetry,
            variant: 'primary',
          },
          {
            label: 'Explore',
            href: '/explore',
            variant: 'default',
            icon: <Compass className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />,
          },
          {
            label: 'Home',
            href: '/',
            variant: 'default',
            icon: <Home className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />,
          },
        ]}
      />
    </div>
  );
}

export default function AboutPage() {
  const openAuthDialog = useAuthDialogStore((s) => s.open);
  const [page, setPage] = useState<AboutMarketingPage | null>(null);
  const [plans, setPlans] = useState<BillingPlanCatalogItem[]>([]);
  const [unavailableReason, setUnavailableReason] = useState<AboutPageLoadReason | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setUnavailableReason(null);
    try {
      const [data, billingPlans] = await Promise.all([
        getAboutMarketingPage(),
        fetchBillingPlans().catch(() => [] as BillingPlanCatalogItem[]),
      ]);
      setPage(data);
      setPlans(billingPlans);
    } catch (e: unknown) {
      setPage(null);
      setPlans([]);
      const reason =
        e instanceof AboutPageLoadError
          ? e.reason
          : e instanceof TypeError
            ? 'network'
            : 'unavailable';
      setUnavailableReason(reason);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  if (loading && !page) {
    return <AboutPageSkeleton />;
  }

  if (unavailableReason) {
    return <AboutPageUnavailable reason={unavailableReason} onRetry={() => void loadPage()} />;
  }

  if (!page) {
    return <AboutPageSkeleton />;
  }

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS)}>
      <div className="w-full space-y-32">
        <header className="max-w-3xl">
          <div className="mb-6 inline-block border-2 border-border bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground shadow">
            {page.hero.badge}
          </div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-foreground sm:text-7xl">
            {page.hero.title}{' '}
            <span className="text-primary underline decoration-8 underline-offset-8">
              {page.hero.titleHighlight}
            </span>
          </h1>
          <p className="mt-8 border-l-4 border-primary pl-6 text-xl font-medium leading-relaxed text-muted-foreground">
            {page.hero.description}
          </p>
        </header>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="border-2 border-border bg-card p-8 shadow lg:col-span-7">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-black uppercase italic">
              <MarketingIcon name="Workflow" className="text-primary" />
              The Journey
            </h2>
            <div className="relative space-y-8 before:absolute before:bottom-2 before:left-3 before:top-2 before:w-1 before:bg-border">
              {page.journey.map((item) => (
                <div key={`${item.year}-${item.sortOrder}`} className="group relative pl-10">
                  <div className="absolute left-0 top-1 z-10 flex h-7 w-7 items-center justify-center border-2 border-border bg-card transition-colors group-hover:bg-primary">
                    <div className="h-2 w-2 bg-border" />
                  </div>
                  <h4 className="text-sm font-black uppercase text-primary">{item.year}</h4>
                  <p className="mt-1 font-medium text-muted-foreground">{item.event}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-2 border-border bg-card p-8 shadow lg:col-span-5">
            <h2 className="mb-8 flex items-center gap-3 text-2xl font-black uppercase italic">
              <MarketingIcon name="Cpu" className="text-primary" />
              Built With
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {page.techStack.map((tech) => (
                <div
                  key={tech.name}
                  className="flex cursor-default items-center gap-3 border-2 border-border bg-muted/20 p-3 transition-transform hover:-translate-y-1 hover:translate-x-1"
                >
                  <MarketingIcon name={tech.icon} className="h-5 w-5" />
                  <span className="text-[11px] font-black uppercase">{tech.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-12">
          <div className="text-center">
            <h2 className="inline-block bg-primary px-4 py-2 text-4xl font-black uppercase italic text-primary-foreground shadow">
              Next-Gen AI Features
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {page.features.map((f) => (
              <div
                key={f.title}
                className="border-2 border-border bg-card p-6 shadow transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
              >
                <MarketingIcon name={f.icon} className="mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 text-lg font-black uppercase">{f.title}</h3>
                <p className="text-sm font-medium text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {plans.length > 0 ? (
          <section className="border-2 border-border bg-muted/30 p-12 shadow">
            <h2 className="mb-12 text-center text-3xl font-black uppercase italic">
              Membership Plans
            </h2>
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.key} className="flex flex-col border-2 border-border bg-card p-8">
                  <h3 className="text-xl font-black uppercase">{plan.name}</h3>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">{plan.description}</p>
                  <div className="my-4 text-4xl font-black">
                    {plan.amountDisplay}
                    <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                      {' '}
                      {plan.cadence}
                    </span>
                  </div>
                  <ul className="mb-8 flex-1 space-y-3">
                    {plan.features.map((feat) => (
                      <li
                        key={feat}
                        className="flex items-center gap-2 text-sm font-bold uppercase tracking-tighter"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-500" /> {feat}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/pricing"
                    className="w-full border-2 border-border bg-primary py-3 text-center font-black uppercase text-primary-foreground shadow transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                  >
                    View {plan.name}
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-12">
          <h2 className="text-center text-3xl font-black uppercase italic">Meet the Architects</h2>
          <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3">
            {page.team.map((dev) => (
              <div key={dev.name} className="group">
                <div className="relative mb-4 inline-block overflow-hidden border-4 border-border shadow">
                  <img src={dev.imageUrl} alt={dev.name} className="h-48 w-48 object-cover" />
                </div>
                <h3 className="text-xl font-black uppercase italic">{dev.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                  {dev.role}
                </p>
                <div className="mt-4 flex justify-center gap-4">
                  {dev.githubUrl ? (
                    <a
                      href={dev.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="GitHub"
                    >
                      <GithubIcon className="h-5 w-5 cursor-pointer hover:text-primary" />
                    </a>
                  ) : (
                    <GithubIcon className="h-5 w-5 text-muted-foreground/40" aria-hidden />
                  )}
                  {dev.xUrl ? (
                    <a href={dev.xUrl} target="_blank" rel="noopener noreferrer" aria-label="X">
                      <XIcon className="h-5 w-5 cursor-pointer hover:text-primary" />
                    </a>
                  ) : (
                    <XIcon className="h-5 w-5 text-muted-foreground/40" aria-hidden />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-4 border-border bg-foreground p-12 text-background shadow dark:bg-primary">
          <div className="flex flex-col items-center gap-8 text-center">
            <h2 className="whitespace-pre-line text-4xl font-black uppercase italic tracking-tighter sm:text-6xl">
              {page.cta.title}
            </h2>
            <p className="max-w-md text-lg font-bold uppercase opacity-90">
              {page.cta.description}
            </p>
            <div className="w-full max-w-xs scale-110">
              <Button variant="primary" className="w-full" onClick={() => openAuthDialog('signup')}>
                {page.cta.buttonLabel}
              </Button>
            </div>
          </div>
        </section>

        {page.footerNote ? (
          <footer className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {page.footerNote}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
