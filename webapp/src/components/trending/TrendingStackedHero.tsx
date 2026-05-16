'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { AlertCircle, Bookmark, Repeat2, WifiOff } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BlogApiConnectionError } from '@/lib/blogAuthFetch';
import { cn } from '@/lib/utils';
import type { Post } from '@/types';

const AUTOPLAY_MS = 7000;
const STACK_DEPTH = 5;

function postHref(post: Post): string {
  const u = post.author.username ?? post.author.id;
  return `/blogs/${encodeURIComponent(u)}/${encodeURIComponent(post.slug)}`;
}

function titleCaseEveryWord(raw: string): string {
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/^[\d:.]+$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function slugToTagChips(slug: string, maxTags = 1): string[] {
  const parts = slug.split('-').filter((p) => p.length > 1);
  return parts.slice(0, maxTags).map((p) => (p.length > 14 ? `${p.slice(0, 12)}…` : p));
}

function titleCaseFromSlug(token: string): string {
  return token
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function categoryLabel(post: Post): string {
  if (post.category?.trim()) return titleCaseFromSlug(post.category.trim());
  const t = post.tags?.find((x) => typeof x === 'string' && x.trim());
  if (t) return t.trim().charAt(0).toUpperCase() + t.trim().slice(1).toLowerCase();
  const fromSlug = slugToTagChips(post.slug, 1)[0];
  if (fromSlug) return titleCaseFromSlug(fromSlug);
  return 'Blog';
}

function formatEngagementCount(n: number): string {
  if (n > 99) return '99+';
  return String(Math.max(0, n));
}

function TrendingHeroEngagementStrip({
  post,
  stacked = false,
}: Readonly<{
  post: Post;
  stacked?: boolean;
}>) {
  const respect = post.respectCount ?? 0;
  const reposts = post.repostCount ?? 0;
  const bookmarks = post.bookmarkCount ?? 0;
  const username = post.author.username ?? post.author.id;

  const avatarSize = stacked ? 'size-9' : 'size-9 sm:size-10';

  const statClass =
    'inline-flex items-center gap-0.5 font-mono text-[10px] font-black tabular-nums text-white drop-shadow sm:text-[11px]';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[25] flex flex-col gap-1.5 p-3 sm:gap-2 sm:p-3.5">
      <div className="flex items-end justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {post.author.image ? (
            <img
              src={post.author.image}
              alt=""
              className={cn(
                avatarSize,
                'shrink-0 rounded-none border-2 border-white/90 object-cover shadow-md',
              )}
            />
          ) : (
            <div
              className={cn(
                avatarSize,
                'flex shrink-0 items-center justify-center rounded-none border-2 border-white/90 bg-white/15 font-mono text-sm font-black text-white',
              )}
              aria-hidden
            >
              {(post.author.name || username).slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-[10px] font-black uppercase tracking-wide text-white drop-shadow">
              {post.author.name}
            </p>
            {username ? (
              <p className="truncate font-mono text-[9px] font-bold uppercase tracking-wider text-white/75">
                @{username}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className="flex shrink-0 flex-col items-end justify-end gap-0.5 text-right"
          aria-label={`Engagement: ${respect} respects, ${reposts} reposts, ${bookmarks} bookmarks`}
        >
          <div className="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 text-white/95">
            <span className={statClass} title="Respects">
              <img src="/svg/icons8-lightning-bolt.svg" alt="" className="size-3.5 object-contain opacity-95" />
              {formatEngagementCount(respect)}
            </span>
            <span className="text-white/35" aria-hidden>
              ·
            </span>
            <span className={statClass} title="Reposts">
              <Repeat2 className="size-3.5 shrink-0 opacity-95" strokeWidth={2.5} aria-hidden />
              {formatEngagementCount(reposts)}
            </span>
            <span className="text-white/35" aria-hidden>
              ·
            </span>
            <span className={statClass} title="Bookmarks">
              <Bookmark className="size-3.5 shrink-0 opacity-95" strokeWidth={2.5} aria-hidden />
              {formatEngagementCount(bookmarks)}
            </span>
          </div>
        </div>
      </div>
      <p
        className={cn(
          'line-clamp-2 min-w-0 w-full overflow-hidden break-words text-left font-sans font-black leading-snug tracking-tight text-white drop-shadow-md',
          stacked
            ? 'max-w-[11.5rem] text-sm sm:max-w-[13rem] sm:text-base'
            : 'max-w-[16rem] sm:max-w-[22rem] md:max-w-[26rem] text-base sm:text-lg',
        )}
        title={post.title}
      >
        {titleCaseEveryWord(post.title)}
      </p>
    </div>
  );
}

export type TrendingStackedHeroProps = Readonly<{
  posts: Post[];
  loading: boolean;
  error: unknown | null;
  onRetry: () => void;
  emptyHeadline?: string;
  emptySub?: string;
}>;

/** Left-anchored active card; inactive deck stacks behind on the right (overlap peek). */
export function TrendingStackedHero({
  posts,
  loading,
  error,
  onRetry,
  emptyHeadline = 'No published posts yet',
  emptySub = 'When writers publish, trending picks will stack here.',
}: TrendingStackedHeroProps) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  /** Drives a one-shot “promoted to front” animation only when a stacked card is clicked. */
  const [frontPromoteAnim, setFrontPromoteAnim] = useState(false);
  const n = posts.length;
  const safe = n > 0 ? active % n : 0;

  useEffect(() => {
    setActive(0);
    setFrontPromoteAnim(false);
  }, [posts]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n <= 1) return;
      setFrontPromoteAnim(false);
      setActive((i) => (i + dir + n) % n);
    },
    [n],
  );

  useEffect(() => {
    if (reduceMotion || n <= 1 || paused || loading) return;
    const id = globalThis.setInterval(() => {
      go(1);
    }, AUTOPLAY_MS);
    return () => globalThis.clearInterval(id);
  }, [n, paused, loading, reduceMotion, go]);

  useEffect(() => {
    if (!frontPromoteAnim) return undefined;
    const ms = reduceMotion ? 0 : 430;
    const id = globalThis.setTimeout(() => setFrontPromoteAnim(false), ms);
    return () => globalThis.clearTimeout(id);
  }, [safe, frontPromoteAnim, reduceMotion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [go]);

  if (loading) {
    return (
      <section className="relative w-full min-w-0" aria-busy="true">
        <div className="relative mx-auto w-full">
          <div className="relative h-[17rem] w-full animate-pulse bg-muted-foreground/10 sm:h-[19rem] md:h-[21rem]">
            <div className="absolute inset-0 bg-muted/50" />
          </div>
        </div>
      </section>
    );
  }

  if (error != null) {
    const isConn = error instanceof BlogApiConnectionError;
    return (
      <section className="border-2 border-border bg-card p-6 shadow-[6px_6px_0_0_var(--border)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-border bg-muted"
            aria-hidden
          >
            {isConn ? (
              <WifiOff className="size-6 text-muted-foreground" strokeWidth={2.25} />
            ) : (
              <AlertCircle className="size-6 text-destructive" strokeWidth={2.25} />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-sans text-base font-bold text-foreground">
              {isConn ? 'Cannot connect to the server' : 'Could not load trending'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isConn
                ? 'Check your connection and try again.'
                : error instanceof Error && error.message
                  ? error.message
                  : 'Something went wrong.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRetry()}
          className="mt-4 border-2 border-border bg-background px-4 py-2 font-mono text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0_0_var(--border)] transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Retry
        </button>
      </section>
    );
  }

  if (n === 0) {
    return (
      <section className="flex min-h-[200px] flex-col items-center justify-center border-2 border-dashed border-border bg-muted/10 p-8 text-center">
        <p className="font-mono text-sm font-black uppercase tracking-wide text-foreground">{emptyHeadline}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{emptySub}</p>
      </section>
    );
  }

  const visible = Math.min(STACK_DEPTH, n);
  const stackSpring = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 540, damping: 32, mass: 0.62 };

  const frontPromoteTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] as const };

  /** Taller hero strip (all stacked cards share this height). */
  const STAGE_H = 'h-[17rem] sm:h-[19rem] md:h-[21rem]';

  const FRONT_WIDTH_PCT = 64;

  function backStackStyle(
    depth: number,
    stackVisible: number,
    frontW: number,
  ): CSSProperties {
    const maxBackDepth = stackVisible - 1;

    if (maxBackDepth <= 0) {
      return {
        right: '3%',
        width: '32%',
      };
    }

    const FRONT_RIGHT_EDGE = frontW;

    /** First back: larger `right` + underlap tucks more of the card under the left hero. */
    if (depth === 1) {
      return {
        right: '8%',
        width: `${100 - FRONT_RIGHT_EDGE + 17}%`,
      };
    }

    if (depth === 2) {
      return {
        right: '0.5%',
        width: `${34 - 4}%`,
      };
    }

    const step = depth - 1;

    return {
      right: `${2 + step * 1.4}%`,
      width: `${34 - step * 4}%`,
    };
  }

  return (
    <section
      className="relative w-full min-w-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Trending stories stack"
    >
      <div className="relative mx-auto w-full">
        <div className={cn('relative isolate w-full overflow-visible', STAGE_H)}>
          {Array.from({ length: visible }, (_, d) => {
            const depth = visible - 1 - d;
            const post = posts[(safe + depth) % n];
            const href = postHref(post);
            const cover = post.coverImage;
            const title = titleCaseEveryWord(post.title);
            const cat = categoryLabel(post);
            const isFront = depth === 0;
            /** Slightly smaller back cards for depth hierarchy. */
            const backCardScale = isFront ? 1 : Math.max(0.82, 1 - depth * 0.045);
            const z = 55 - depth;
            const rotateY = 0;
            const rotateZ = 0;
            const fanX = 0;

            const postIndex = (safe + depth) % n;
            const trendingRank = postIndex + 1;

            /** Cover + scrims + badges; strip is a sibling so stacked actions stay usable. */
            const mediaBlock = (
              <div className={cn('relative w-full overflow-hidden bg-muted', STAGE_H)}>
                {cover ? (
                  <img src={cover} alt="" className="h-full w-full object-cover object-center" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-muted to-background font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    No cover
                  </div>
                )}
                {isFront ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 top-[40%] z-[3] bg-linear-to-t from-black/90 via-black/48 to-transparent"
                    aria-hidden
                  />
                ) : (
                  <div
                    className="pointer-events-none absolute inset-0 z-[3] bg-linear-to-t from-black/70 via-black/26 to-black/05"
                    aria-hidden
                  />
                )}
                <span className="pointer-events-none absolute left-2 top-2 z-[6] max-w-[52%] truncate rounded-none border-2 border-primary bg-primary px-2 py-0.5 font-sans text-[9px] font-black uppercase tracking-wide text-primary-foreground shadow-sm sm:left-2.5 sm:top-2.5 sm:text-[10px]">
                  {cat}
                </span>
                <span
                  className="pointer-events-none absolute right-2 top-2 z-[6] rounded-none border-2 border-border bg-background px-2 py-1 font-mono text-[10px] font-black tabular-nums text-foreground shadow-[3px_3px_0_0_var(--border)]"
                  aria-hidden
                >
                  #{trendingRank}
                </span>
              </div>
            );

            const cardBody = (
              <div className="relative h-full w-full">
                {mediaBlock}
                {isFront ? (
                  <Link
                    href={href}
                    className="absolute inset-x-0 top-0 bottom-[42%] z-[14] block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    aria-label={`Open ${title}`}
                  />
                ) : (
                  <button
                    type="button"
                    className="absolute inset-x-0 top-0 bottom-[42%] z-[12] cursor-pointer rounded-none border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    aria-label={`Bring to front: ${title}`}
                    onClick={() => {
                      setFrontPromoteAnim(true);
                      setActive((safe + depth) % n);
                    }}
                  />
                )}
                <TrendingHeroEngagementStrip post={post} stacked={!isFront} />
              </div>
            );

            const positionStyle: CSSProperties = isFront
              ? {
                  left: 0,
                  width: `${FRONT_WIDTH_PCT}%`,
                  top: '50%',
                }
              : {
                  ...backStackStyle(depth, visible, FRONT_WIDTH_PCT),
                  top: '50%',
                };

            return (
              <motion.div
                key={depth}
                className="absolute cursor-default"
                style={{
                  zIndex: z,
                  transformOrigin: isFront ? 'left center' : 'right center',
                  ...positionStyle,
                }}
                initial={false}
                animate={{
                  y: '-50%',
                  x: isFront ? 0 : fanX,
                  scale: backCardScale,
                  rotateY,
                  rotateZ,
                }}
                transition={stackSpring}
              >
                <div
                  className={cn(
                    'h-full w-full overflow-hidden rounded-none border-2 border-border bg-background shadow-[6px_6px_0_0_var(--border)]',
                    isFront && 'shadow-[10px_10px_0_0_var(--border)]',
                  )}
                >
                  {isFront ? (
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={post.id}
                        className="h-full w-full"
                        initial={
                          reduceMotion || !frontPromoteAnim
                            ? false
                            : {
                                opacity: 0,
                                scale: 0.985,
                                boxShadow:
                                  '0 0 0 10px rgba(255,255,255,0.92), 0 0 0 14px rgba(255,255,255,0.35), 0 18px 48px rgba(0,0,0,0.35)',
                              }
                        }
                        animate={{
                          opacity: 1,
                          scale: 1,
                          boxShadow: '0 0 0 0 rgba(0,0,0,0)',
                        }}
                        exit={{ opacity: 1, transition: { duration: 0 } }}
                        transition={frontPromoteTransition}
                      >
                        {cardBody}
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    cardBody
                  )}
                </div>
              </motion.div>
            );
          })}

          {n > 1 ? (
            <motion.div
              className="absolute left-0 top-0 z-[22] cursor-grab active:cursor-grabbing"
              style={{
                width: `${FRONT_WIDTH_PCT}%`,
                bottom: '11rem',
                left: 0,
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={(_, info) => {
                const x = info.offset.x + info.velocity.x * 0.12;
                if (x < -52) go(1);
                else if (x > 52) go(-1);
              }}
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
