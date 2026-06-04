'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Compass, Loader2 } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { HelpLucideIcon } from '@/lib/help/helpIcons';
import {
  fetchPublishedHelpArticlesPage,
  HELP_FAQ_PAGE_SIZE,
} from '@/lib/api/helpPublic';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { RailFeedEmptyState } from '@/components/layout/rail/RailFeedEmptyState';
import { RailSectionSubheader } from '@/components/layout/rail/RailSectionSubheader';
import { RetroSortDropdown } from '@/components/ui/retro';

export type HelpFaqItemData = {
  id: string;
  title: string;
  body: string;
  summary: string;
  icon: string;
};

export type HelpHubConfig = {
  title: string;
  description: string;
  supportLinkLabel: string;
  supportLinkHref: string;
  headerIcon: string;
  emptyTitle: string;
  emptyDescription: string;
};

type HelpFaqSectionProps = {
  config: HelpHubConfig;
  /** Inline FAQs (e.g. sign-in help) — skips API fetch, search, sort, and pagination. */
  staticItems?: HelpFaqItemData[];
};

export type HelpFaqSort = 'latest' | 'oldest';

const HELP_SORT_OPTIONS = [
  { value: 'latest' as const, label: 'Latest first', shortLabel: 'Latest' },
  { value: 'oldest' as const, label: 'Oldest first', shortLabel: 'Oldest' },
];

const RETRO_SHADOW_SM =
  'shadow active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all';

function answerText(item: HelpFaqItemData): string {
  const body = item.body?.trim();
  if (body) return body;
  return item.summary?.trim() ?? '';
}

function HelpPageTitle({ title }: Readonly<{ title: string }>) {
  const lower = title.toLowerCase();
  if (lower.startsWith('frequently')) {
    const rest = title.slice('frequently'.length).trimStart();
    return (
      <>
        <span className="text-primary">Frequently</span>
        {rest ? <> {rest}</> : null}
      </>
    );
  }
  return <>{title}</>;
}

function HelpPageDescription({ config }: Readonly<{ config: HelpHubConfig }>) {
  return (
    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
      {config.description}
      {config.supportLinkLabel ? (
        <>
          {' '}
          <Link
            href={config.supportLinkHref || '/contact'}
            className="font-bold text-primary underline underline-offset-4 hover:opacity-90"
          >
            {config.supportLinkLabel}
          </Link>
        </>
      ) : null}
    </p>
  );
}

function HelpCenterBlinkTitle() {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 font-mono text-sm font-black uppercase tracking-wide text-foreground">
      <span className="size-2 shrink-0 animate-pulse bg-primary" aria-hidden />
      Help Center
    </span>
  );
}

function FaqRow({
  item,
  open,
  onToggle,
}: Readonly<{
  item: HelpFaqItemData;
  open: boolean;
  onToggle: () => void;
}>) {
  const answer = answerText(item);
  return (
    <div
      className={cn(
        'border-2 border-border transition-colors',
        open
          ? 'bg-primary text-primary-foreground'
          : 'bg-white hover:bg-neutral-50 dark:bg-card dark:hover:bg-muted/30'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors sm:gap-3 sm:px-3.5 sm:py-3',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
        )}
        aria-expanded={open}
      >
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center border-2 shadow sm:size-10',
            open
              ? 'border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground'
              : 'border-border bg-white text-primary dark:bg-card'
          )}
        >
          <HelpLucideIcon name={item.icon} className="size-4" />
        </span>
        <span className="min-w-0 flex-1 font-mono text-xs font-black uppercase leading-snug tracking-tight sm:text-sm">
          {item.title}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 transition-transform duration-200 sm:size-[1.125rem]',
            open ? 'rotate-180 text-primary-foreground' : 'text-muted-foreground'
          )}
          strokeWidth={2.5}
        />
      </button>
      {open ? (
        <div className="px-3 pb-3 pt-0 sm:px-3.5 sm:pb-3.5">
          <p className="max-w-none whitespace-pre-wrap text-sm leading-relaxed text-primary-foreground">
            {answer || 'No answer published yet.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function HelpFaqPagination({
  page,
  totalPages,
  onPage,
}: Readonly<{
  page: number;
  totalPages: number;
  onPage: (next: number) => void;
}>) {
  if (totalPages <= 1) return null;
  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
      aria-label="FAQ pagination"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Previous page"
        className={cn(
          'inline-flex items-center gap-1 border-2 border-border bg-background px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-foreground disabled:cursor-not-allowed disabled:opacity-40',
          RETRO_SHADOW_SM
        )}
      >
        <ChevronLeft className="size-4" aria-hidden />
        Prev
      </button>
      <span className="px-2 font-mono text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Next page"
        className={cn(
          'inline-flex items-center gap-1 border-2 border-border bg-background px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest text-foreground disabled:cursor-not-allowed disabled:opacity-40',
          RETRO_SHADOW_SM
        )}
      >
        Next
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}

function FaqListSkeleton() {
  return (
    <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 md:gap-4" aria-hidden>
      {Array.from({ length: HELP_FAQ_PAGE_SIZE }, (_, i) => (
        <div key={i} className="h-[52px] animate-pulse border-2 border-border bg-muted/40" />
      ))}
    </div>
  );
}

function HelpFaqToolbar({
  searchInput,
  onSearchChange,
  sort,
  onSortChange,
}: Readonly<{
  searchInput: string;
  onSearchChange: (value: string) => void;
  sort: HelpFaqSort;
  onSortChange: (value: HelpFaqSort) => void;
}>) {
  return (
    <RailSectionSubheader
      className="mb-6 w-full"
      text={<HelpCenterBlinkTitle />}
      search={{
        value: searchInput,
        onChange: onSearchChange,
        placeholder: 'Search FAQs…',
        ariaLabel: 'Search help articles',
        wrapperClassName: 'max-w-[11rem] sm:max-w-[15rem]',
      }}
      swiperButtons={
        <RetroSortDropdown
          value={sort}
          onChange={onSortChange}
          options={HELP_SORT_OPTIONS}
          ariaLabelPrefix="Sort help articles"
          triggerClassName="sm:min-w-[8.25rem]"
        />
      }
    />
  );
}

export function HelpFaqSection({ config, staticItems }: Readonly<HelpFaqSectionProps>) {
  const isStatic = Boolean(staticItems?.length);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const query = (searchParams.get('q') ?? '').trim();
  const sortParam = searchParams.get('sort');
  const sort: HelpFaqSort = sortParam === 'oldest' ? 'oldest' : 'latest';

  const [searchInput, setSearchInput] = useState(query);
  const [items, setItems] = useState<HelpFaqItemData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / HELP_FAQ_PAGE_SIZE));
  const hasFilters = Boolean(query);

  const replaceParams = useCallback(
    (updates: { page?: number; q?: string | null; sort?: HelpFaqSort | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.page !== undefined) {
        if (updates.page <= 1) params.delete('page');
        else params.set('page', String(updates.page));
      }
      if (updates.q !== undefined) {
        const term = updates.q?.trim() ?? '';
        if (term) params.set('q', term);
        else params.delete('q');
      }
      if (updates.sort !== undefined) {
        if (updates.sort === 'oldest') params.set('sort', 'oldest');
        else params.delete('sort');
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    if (isStatic) return;
    const handle = window.setTimeout(() => {
      if (searchInput.trim() === query) return;
      replaceParams({ q: searchInput.trim() || null, page: 1 });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [isStatic, searchInput, query, replaceParams]);

  useEffect(() => {
    if (isStatic) {
      setItems(staticItems ?? []);
      setTotal(staticItems?.length ?? 0);
      setOpenId(staticItems?.[0]?.id ?? null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchPublishedHelpArticlesPage(
      { page, pageSize: HELP_FAQ_PAGE_SIZE, q: query || undefined, sort },
      { revalidate: false }
    ).then((result) => {
      if (cancelled) return;
      const nextItems: HelpFaqItemData[] = result.data.map((article) => ({
        id: article.slug,
        title: article.title,
        body: article.body,
        summary: article.summary,
        icon: article.icon,
      }));
      setItems(nextItems);
      setTotal(result.total);
      setOpenId(nextItems[0]?.id ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isStatic, page, query, sort, staticItems]);

  const showHubEmpty = !loading && items.length === 0 && !hasFilters && total === 0;

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'w-full py-10 pb-20 md:py-14')}>
      <div className="mx-auto">
        <header className="mb-8 mt-4 flex w-full flex-col items-center text-center sm:mb-10 sm:mt-6 md:mt-8">
          <span className="mb-5 flex size-14 items-center justify-center border-2 border-border bg-card text-primary shadow sm:mb-6">
            <CircleHelp className="size-6" strokeWidth={2.25} aria-hidden />
          </span>
          <h1 className="max-w-2xl font-mono text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
            <HelpPageTitle title={config.title} />
          </h1>
          <HelpPageDescription config={config} />
        </header>

        {!isStatic ? (
          <HelpFaqToolbar
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            sort={sort}
            onSortChange={(next) => replaceParams({ sort: next, page: 1 })}
          />
        ) : null}

        {loading ? (
          <div className="relative w-full">
            <FaqListSkeleton />
            <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-8">
              <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading FAQs" />
            </div>
          </div>
        ) : showHubEmpty ? (
          <RailFeedEmptyState
            icon={CircleHelp}
            title={config.emptyTitle || 'No help articles yet'}
            description={
              config.emptyDescription ||
              'Answers to common questions will show up here once published. Browse topics or explore while you wait.'
            }
            className="min-h-[320px] w-full justify-center sm:min-h-[360px]"
            actions={[
              {
                label: 'Browse topics',
                href: '/topics',
                variant: 'primary',
                icon: <Compass className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />,
              },
              {
                label: 'Explore',
                href: '/explore',
                variant: 'default',
              },
            ]}
          />
        ) : items.length === 0 ? (
          <RailFeedEmptyState
            icon={CircleHelp}
            title="No matches"
            description="Try a different search term or clear your search to see more FAQs."
            className="min-h-[240px] w-full justify-center"
            actions={[
              {
                label: 'Clear search',
                onClick: () => {
                  setSearchInput('');
                  replaceParams({ q: null, page: 1 });
                },
                variant: 'primary',
              },
            ]}
          />
        ) : (
          <>
            {!isStatic ? (
              <p className="mb-4 w-full text-center font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {total} {total === 1 ? 'article' : 'articles'}
                {query ? (
                  <>
                    {' '}
                    matching &ldquo;{query}&rdquo;
                  </>
                ) : null}
              </p>
            ) : null}
            <div
              className="grid w-full grid-cols-1 items-start gap-3 md:grid-cols-2 md:gap-4"
              aria-label="Help articles"
            >
              {items.map((item) => (
                <FaqRow
                  key={item.id}
                  item={item}
                  open={openId === item.id}
                  onToggle={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
                />
              ))}
            </div>
            {!isStatic ? (
              <HelpFaqPagination
                page={page}
                totalPages={totalPages}
                onPage={(next) => replaceParams({ page: next })}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
