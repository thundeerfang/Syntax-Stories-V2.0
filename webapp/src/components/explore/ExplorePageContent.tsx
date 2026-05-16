'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Hash,
  Layers,
  UsersRound,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { blogApi } from '@/api/blog';
import { squadsApi, type SquadSummary } from '@/api/squads';
import { fetchTagsExplore, type TagExploreRow } from '@/api/tagsExplore';
import { CompactBlogPostsSwiper } from '@/components/blog/CompactBlogPostsSwiper';
import { HashtagBadgeLink } from '@/components/tags/HashtagBadgeLink';
import { Button } from '@/components/ui/Button';
import { PanelSectionHeader } from '@/components/explore/ExploreSectionHeaderCard';
import { RailSectionSubheader } from '@/components/layout/RailSectionSubheader';
import { ExploreTopSquadsBlock } from '@/components/explore/ExploreTopSquadsBlock';
import { TaxonomyCategoryCard } from '@/components/explore/TaxonomyCategoryCard';
import { mapPublicFeedPostToPost } from '@/lib/mapFeedPostToPost';
import { resolvePublicApiBase } from '@/lib/publicApiBase';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';
import { cn } from '@/lib/utils';
import type { BlogTaxonomyRow } from '@/types/blog';
import type { Post } from '@/types';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { toast } from 'sonner';
const TRAIL_AUTO_MS = 6500;
const EXPLORE_FEED_LIMIT = 20;

/** Spotlight carousel: live API shapes only (no explore dummy trail). */
type SpotlightItem =
  | { kind: 'squad'; squad: SquadSummary }
  | { kind: 'tag'; tag: { slug: string; name: string; postCount: number } }
  | { kind: 'category'; category: { slug: string; name: string; blurb: string } };

/** Retro / terminal panel tokens */
const RETRO_SHADOW =
  'shadow-[4px_4px_0_0_var(--border)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all';
const RETRO_BORDER = 'border-2 border-[var(--border)]';
const GLOW_TEXT = 'drop-shadow-[0_0_8px_var(--primary)]';

function TrailBadge({ kind }: Readonly<{ kind: SpotlightItem['kind'] }>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 bg-[var(--primary)] px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-[var(--background)]',
        RETRO_SHADOW,
      )}
    >
      {kind === 'squad' ? <UsersRound className="size-3" aria-hidden /> : kind === 'tag' ? <Hash className="size-3" aria-hidden /> : <Layers className="size-3" aria-hidden />}
      {kind}
    </span>
  );
}

function trailHref(item: SpotlightItem): string {
  if (item.kind === 'squad') return `/squads/${encodeURIComponent(item.squad.slug)}`;
  if (item.kind === 'tag') return `/topics/${encodeURIComponent(item.tag.slug)}`;
  return `/topics/category/${encodeURIComponent(item.category.slug)}`;
}

function trailCtaLabel(kind: SpotlightItem['kind']): string {
  if (kind === 'squad') return 'Open squad';
  if (kind === 'tag') return 'Open tag stream';
  return 'Open category';
}

function squadSpotlightIcon(s: SquadSummary): ReactNode {
  const base = resolvePublicApiBase().replace(/\/$/, '');
  const raw = s.iconUrl?.trim();
  let src: string | undefined;
  if (raw?.startsWith('http://') || raw?.startsWith('https://') || raw?.startsWith('data:')) {
    src = raw;
  } else if (raw) {
    src = `${base}${raw.startsWith('/') ? '' : '/'}${raw}`;
  }
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="mr-2 inline-block size-11 shrink-0 rounded-none border-2 border-border object-cover align-middle sm:size-12"
      />
    );
  }
  return <UsersRound className="mr-2 inline-block size-10 shrink-0 align-middle text-primary sm:size-11" strokeWidth={2} aria-hidden />;
}

function mergeHotTags(popular: TagExploreRow[], trending: TagExploreRow[], limit: number): TagExploreRow[] {
  const seen = new Set<string>();
  const out: TagExploreRow[] = [];
  for (const row of [...trending, ...popular]) {
    const k = row.slug.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

function buildSpotlightItems(
  tagsEx: { trending: TagExploreRow[]; popular: TagExploreRow[] },
  squads: SquadSummary[],
  categories: BlogTaxonomyRow[],
): SpotlightItem[] {
  const squadItems: SpotlightItem[] = squads
    .filter((s) => s.visibility === 'public')
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 4)
    .map((s) => ({ kind: 'squad' as const, squad: s }));

  const trending = tagsEx.trending.length ? tagsEx.trending : tagsEx.popular;
  const tagItems: SpotlightItem[] = trending.slice(0, 5).map((t) => ({
    kind: 'tag' as const,
    tag: { slug: t.slug, name: t.name, postCount: t.postCount },
  }));

  const catItems: SpotlightItem[] = [...categories]
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 4)
    .map((c) => ({
      kind: 'category' as const,
      category: {
        slug: c.slug,
        name: c.name,
        blurb: c.description?.trim() ? c.description.trim() : `Stories filed under ${c.name}.`,
      },
    }));

  const out: SpotlightItem[] = [];
  const maxLoop = Math.max(squadItems.length, tagItems.length, catItems.length);
  for (let i = 0; i < maxLoop; i++) {
    if (squadItems[i]) out.push(squadItems[i]!);
    if (tagItems[i]) out.push(tagItems[i]!);
    if (catItems[i]) out.push(catItems[i]!);
  }
  return out.slice(0, 14);
}

function ExploreFeaturedTrail({
  items,
  loading,
}: Readonly<{
  items: SpotlightItem[];
  loading: boolean;
}>) {
  const reduceMotion = useReducedMotion();
  const n = items.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (n <= 1) return;
    setIndex((i) => Math.min(i, n - 1));
  }, [n]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n <= 1) return;
      setIndex((i) => (i + dir + n) % n);
    },
    [n],
  );

  useEffect(() => {
    if (reduceMotion || n <= 1 || paused) return;
    const id = globalThis.setInterval(() => setIndex((i) => (i + 1) % n), TRAIL_AUTO_MS);
    return () => globalThis.clearInterval(id);
  }, [n, paused, reduceMotion]);

  const item = n > 0 ? items[Math.min(index, n - 1)]! : null;
  const t = reduceMotion ? { duration: 0 } : { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const };

  if (loading) {
    return (
      <section className="relative w-full min-w-0" aria-busy="true" aria-label="Loading spotlight">
        <div
          className={cn(
            'relative flex min-h-[min(48vh,380px)] w-full flex-col justify-end overflow-hidden bg-muted/20 p-6 md:min-h-[360px] md:p-10',
            RETRO_BORDER,
            'shadow-[8px_8px_0_0_var(--primary)]',
          )}
        >
          <div className="h-10 w-40 animate-pulse bg-muted-foreground/15" />
          <div className="mt-8 h-16 max-w-xl animate-pulse bg-muted-foreground/10" />
          <div className="mt-4 h-20 max-w-lg animate-pulse bg-muted-foreground/10" />
        </div>
      </section>
    );
  }

  if (!item) {
    return (
      <section className="relative w-full min-w-0">
        <div
          className={cn(
            'relative flex min-h-[220px] w-full flex-col items-start justify-center gap-4 overflow-hidden bg-card p-6 md:min-h-[260px] md:p-10',
            RETRO_BORDER,
            'shadow-[8px_8px_0_0_var(--primary)]',
          )}
        >
          <p className="font-mono text-sm font-black uppercase text-muted-foreground">No spotlight items yet</p>
          <p className="max-w-md text-xs uppercase leading-relaxed text-muted-foreground">
            Publish posts with tags, create squads, or open topics — this carousel fills from live taxonomy and the public directory.
          </p>
          <Link
            href="/topics"
            className={cn(
              'inline-flex items-center gap-2 bg-[var(--primary)] px-6 py-3 font-mono text-xs font-bold uppercase text-[var(--background)]',
              RETRO_SHADOW,
            )}
          >
            Browse topics <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="group relative w-full min-w-0"
      aria-roledescription="carousel"
      aria-label="Featured squads, tags, and categories"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className={cn(
          'relative flex min-h-[min(48vh,380px)] w-full flex-col justify-end overflow-hidden bg-[var(--background)] p-6 md:min-h-[360px] md:p-10',
          RETRO_BORDER,
          'shadow-[8px_8px_0_0_var(--primary)]',
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-[length:100%_2px,3px_100%] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] opacity-10 dark:opacity-[0.14]"
          aria-hidden
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${item.kind}-${index}-${item.kind === 'squad' ? item.squad.slug : item.kind === 'tag' ? item.tag.slug : item.category.slug}`}
            role="group"
            aria-roledescription="slide"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
            transition={t}
            className="relative z-20"
          >
            <TrailBadge kind={item.kind} />

            <h3
              className={cn(
                'mt-5 font-mono text-3xl font-black uppercase leading-none tracking-tighter sm:text-5xl md:text-6xl',
                GLOW_TEXT,
              )}
            >
              {item.kind === 'squad' ? (
                <>
                  {squadSpotlightIcon(item.squad)}
                  {item.squad.name}
                </>
              ) : item.kind === 'tag' ? (
                `#${item.tag.name}`
              ) : (
                item.category.name
              )}
            </h3>

            <p className="mt-4 max-w-xl font-mono text-sm uppercase leading-relaxed text-[var(--muted-foreground)]">
              {item.kind === 'squad'
                ? item.squad.description
                : item.kind === 'tag'
                  ? `${item.tag.postCount.toLocaleString()} posts indexed under this tag.`
                  : item.category.blurb}
            </p>

            {item.kind === 'squad' ? (
              <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
                {item.squad.memberCount.toLocaleString()} members · {item.squad.visibility} node
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={trailHref(item)}
                className={cn(
                  'inline-flex items-center gap-2 bg-[var(--primary)] px-6 py-3 font-mono text-xs font-bold uppercase text-[var(--background)]',
                  RETRO_SHADOW,
                )}
              >
                {trailCtaLabel(item.kind)} <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute right-6 top-6 z-30 flex gap-2">
          <button
            type="button"
            aria-label="Previous spotlight"
            onClick={() => go(-1)}
            disabled={n <= 1}
            className={cn('bg-[var(--card)] p-3 disabled:opacity-40', RETRO_BORDER, RETRO_SHADOW)}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next spotlight"
            onClick={() => go(1)}
            disabled={n <= 1}
            className={cn('bg-[var(--card)] p-3 disabled:opacity-40', RETRO_BORDER, RETRO_SHADOW)}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      {n > 1 ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
              className={cn(
                'h-2 rounded-none border-2 border-[var(--border)] transition-[width,background-color] duration-300',
                i === index ? 'w-8 bg-[var(--primary)]' : 'w-2 bg-[var(--card)] hover:bg-[var(--muted)]',
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ExploreHotTagsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2" aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-10 w-24 animate-pulse border-2 border-border bg-muted/35 sm:w-[7.25rem]"
        />
      ))}
    </div>
  );
}

function ExploreSectorGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3" aria-busy="true" aria-label="Loading sectors">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'min-h-[220px] animate-pulse border-2 border-border bg-muted/30',
            i === 0 && 'md:col-span-2 md:min-h-[260px]',
          )}
        />
      ))}
    </div>
  );
}

export function ExplorePageContent() {
  const token = useAuthStore((s) => s.token);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [exploreJoinBusySlug, setExploreJoinBusySlug] = useState<string | null>(null);

  const [spotlightItems, setSpotlightItems] = useState<SpotlightItem[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(true);
  const [hotTags, setHotTags] = useState<TagExploreRow[]>([]);

  const [topPublicSquads, setTopPublicSquads] = useState<SquadSummary[]>([]);

  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<unknown | null>(null);
  const [taxonomyCats, setTaxonomyCats] = useState<BlogTaxonomyRow[]>([]);

  const loadSpotlightAndTags = useCallback(async () => {
    setSpotlightLoading(true);
    try {
      const [tagsEx, squadsRes, tax] = await Promise.all([
        fetchTagsExplore(),
        squadsApi.listPublic({ limit: 120 }),
        blogApi.getTaxonomy(),
      ]);
      const cats = tax.categories ?? [];
      setTaxonomyCats(cats);
      setHotTags(mergeHotTags(tagsEx.popular, tagsEx.trending, 14));
      setSpotlightItems(buildSpotlightItems(tagsEx, squadsRes.squads, cats));
      const topSorted = squadsRes.squads
        .filter((s) => s.visibility === 'public')
        .sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name));
      setTopPublicSquads(topSorted.slice(0, 24));
    } catch {
      setTaxonomyCats([]);
      setHotTags([]);
      setSpotlightItems([]);
      setTopPublicSquads([]);
    } finally {
      setSpotlightLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSpotlightAndTags();
  }, [loadSpotlightAndTags]);

  const sectorPreview = useMemo(
    () =>
      [...taxonomyCats]
        .sort((a, b) => b.postCount - a.postCount)
        .slice(0, 5)
        .map((c) => ({
          slug: c.slug,
          name: c.name,
          blurb: c.description?.trim() ? c.description.trim() : `Writers filing stories under ${c.name}.`,
          postCount: c.postCount,
        })),
    [taxonomyCats],
  );

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const { posts: raw } = await blogApi.getPublishedFeed(EXPLORE_FEED_LIMIT);
      setFeedPosts(raw.map(mapPublicFeedPostToPost));
    } catch (e) {
      setFeedError(e);
      setFeedPosts([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const bufferSwiperPosts = useMemo(() => feedPosts.slice(0, 12), [feedPosts]);

  const handleExploreTopJoin = useCallback(
    async (squadSlug: string) => {
      if (!token) {
        openAuth('login');
        return;
      }
      setExploreJoinBusySlug(squadSlug);
      try {
        await squadsApi.join(squadSlug, token);
        toast.success('Joined squad');
        await loadSpotlightAndTags();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not join');
      } finally {
        setExploreJoinBusySlug(null);
      }
    },
    [token, openAuth, loadSpotlightAndTags],
  );

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col gap-10 md:gap-12')}>
      <ExploreFeaturedTrail items={spotlightItems} loading={spotlightLoading} />

      <ExploreTopSquadsBlock
        squads={topPublicSquads}
        loading={spotlightLoading}
        joinBusySlug={exploreJoinBusySlug}
        onJoin={handleExploreTopJoin}
      />

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-stretch lg:gap-6">
        <div className="flex min-h-0 lg:col-span-1">
          <div
            className="flex h-full min-h-0 w-full flex-col border-2 border-border bg-card p-4 shadow-[4px_4px_0_0_var(--border)] sm:p-5"
            aria-busy={spotlightLoading}
          >
            <div className="shrink-0">
              <PanelSectionHeader eyebrow="Metadata" title="Hot tags" description="Live from published posts — each pill opens the tag stream." />
            </div>
            <div className="mt-3 min-h-0 flex-1 overflow-hidden">
              <div className="ss-scrollbar-hide h-full min-h-0 overflow-y-auto">
                <div className="flex flex-wrap content-start gap-2">
                  {spotlightLoading ? (
                    <ExploreHotTagsSkeleton />
                  ) : hotTags.length === 0 ? (
                    <p className="w-full text-[10px] font-mono uppercase text-muted-foreground">No tagged posts yet.</p>
                  ) : (
                    hotTags.map((tag) => (
                      <HashtagBadgeLink key={tag.slug} slug={tag.slug} label={tag.name} postCount={tag.postCount} />
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="mt-auto w-full shrink-0 border-t border-border pt-3">
              {spotlightLoading ? (
                <div className="h-12 w-full animate-pulse border-2 border-border bg-muted/40" aria-hidden />
              ) : (
                <Button
                  href="/topics"
                  variant="primary"
                  size="lg"
                  className="flex w-full justify-center font-mono text-[11px] font-black uppercase shadow-none sm:text-xs"
                >
                  View all
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-col lg:col-span-2">
          <CompactBlogPostsSwiper
            className="flex h-full min-h-0 flex-col"
            mode="rail"
            posts={bufferSwiperPosts}
            loading={feedLoading}
            error={feedError}
            onRetry={loadFeed}
            aria-label="Latest published stories"
            headerStart={
              <>
                <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_65%,transparent)]" />
                </span>
                <h3 className="min-w-0 truncate font-mono text-sm font-black uppercase text-muted-foreground">
                  Latest buffer transmissions
                </h3>
              </>
            }
          />
        </div>
      </section>

      <section className="space-y-4">
        <RailSectionSubheader
          text={
            spotlightLoading
              ? 'Sector categories'
              : sectorPreview.length > 0
                ? `Sector categories · ${sectorPreview.length} ${sectorPreview.length === 1 ? 'sector' : 'sectors'}`
                : 'Sector categories'
          }
          buttons={[
            {
              label: 'View all',
              href: '/topics',
              variant: 'primary',
            },
          ]}
        />
        {spotlightLoading ? (
          <ExploreSectorGridSkeleton />
        ) : sectorPreview.length === 0 ? (
          <p className="border-2 border-dashed border-border bg-muted/10 px-4 py-10 text-center font-mono text-xs uppercase text-muted-foreground">
            No taxonomy sectors loaded yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {sectorPreview.map((cat, idx: number) => (
              <TaxonomyCategoryCard
                key={cat.slug}
                slug={cat.slug}
                name={cat.name}
                blurb={cat.blurb}
                postCount={cat.postCount}
                href={`/topics/category/${encodeURIComponent(cat.slug)}`}
                variant={idx === 0 ? 'sector-hero' : 'sector-card'}
                index={idx + 1}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
