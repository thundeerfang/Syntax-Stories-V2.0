'use client';

import type { ReactNode } from 'react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BlogCard } from './BlogCard';
import { RailFeedErrorState } from '@/components/layout';
import { CompactBlogPostsSwiperSkeleton } from '@/components/skeletons';
import { cn } from '@/lib/core/utils';
import type { Post } from '@/types';

export type CompactBlogPostsSwiperHandle = Readonly<{
  scrollPrev: () => void;
  scrollNext: () => void;
}>;

export type CompactBlogPostsSwiperProps = Readonly<{
  posts: Post[];
  loading: boolean;
  error: unknown | null;
  onRetry: () => void;
  'aria-label'?: string;
  className?: string;
  emptyHeadline?: string;
  emptySub?: string;
  mode?: 'rail' | 'bookmarksGrid';
  /** Renders left of the scroll arrows on one row (e.g. live dot + title). */
  headerStart?: ReactNode;
  /** When false, hide built-in arrow row (use ref + scrollPrev/scrollNext). Default true. */
  showToolbarArrows?: boolean;
  /** Dot pagination under the track. Default true. */
  showPagination?: boolean;
  /** Snap between slides. Default true. */
  snapSlides?: boolean;
}>;

function getScrollStridePx(scroller: HTMLDivElement): number {
  const a = scroller.children.item(0) as HTMLElement | null;
  const b = scroller.children.item(1) as HTMLElement | null;

  if (a && b) return b.offsetLeft - a.offsetLeft;
  if (a) return a.offsetWidth;

  return 0;
}

export const CompactBlogPostsSwiper = forwardRef<CompactBlogPostsSwiperHandle, CompactBlogPostsSwiperProps>(
  function CompactBlogPostsSwiper(
    {
      posts,
      loading,
      error,
      onRetry,
      'aria-label': ariaLabel = 'Latest stories',
      className,
      emptyHeadline = 'No published posts yet',
      emptySub = 'When someone publishes, it will show up here.',
      mode = 'bookmarksGrid',
      headerStart,
      showToolbarArrows = true,
      showPagination = true,
      snapSlides = true,
    },
    ref,
  ) {
    const [index, setIndex] = useState(0);

    const scrollerRef = useRef<HTMLDivElement>(null);

    const n = posts.length;

    const syncIndexFromScroll = useCallback(() => {
      const el = scrollerRef.current;

      if (!el || n <= 0) return;

      const stride = getScrollStridePx(el);

      if (stride <= 0) return;

      const i = Math.min(
        n - 1,
        Math.max(0, Math.round(el.scrollLeft / stride)),
      );

      setIndex(i);
    }, [n]);

    useEffect(() => {
      const el = scrollerRef.current;

      if (!el) return;

      el.scrollTo({ left: 0 });

      setIndex(0);
    }, [posts]);

    useEffect(() => {
      const el = scrollerRef.current;

      if (!el || n <= 1) return;

      el.addEventListener('scroll', syncIndexFromScroll, {
        passive: true,
      });

      syncIndexFromScroll();

      return () =>
        el.removeEventListener('scroll', syncIndexFromScroll);
    }, [n, posts, syncIndexFromScroll]);

    const scrollByStep = useCallback(
      (dir: -1 | 1) => {
        const el = scrollerRef.current;

        if (!el || n <= 1) return;

        const stride = getScrollStridePx(el);

        if (stride <= 0) return;

        el.scrollBy({
          left: dir * stride,
          behavior: 'smooth',
        });
      },
      [n],
    );

    useImperativeHandle(
      ref,
      () => ({
        scrollPrev: () => scrollByStep(-1),
        scrollNext: () => scrollByStep(1),
      }),
      [scrollByStep],
    );

    if (loading) {
      return (
        <CompactBlogPostsSwiperSkeleton
          slideCount={mode === 'rail' ? 3 : 4}
          showToolbar={Boolean(headerStart) || showToolbarArrows}
          className={className}
        />
      );
    }

    if (error != null) {
      return (
        <RailFeedErrorState
          variant="inline"
          className={className}
          title="Could not load stories"
          error={error}
          onRetry={onRetry}
        />
      );
    }

    if (n === 0) {
      return (
        <div
          className={cn(
            'flex min-h-[160px] w-full flex-col justify-center border-2 border-dashed border-border bg-muted/10 p-6 text-center',
            className,
          )}
        >
          <p className="font-mono text-xs font-black uppercase tracking-wide text-foreground">
            {emptyHeadline}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            {emptySub}
          </p>
        </div>
      );
    }

    const slideCn =
      mode === 'rail'
        ? cn(
            'flex-none',
            snapSlides && 'snap-start snap-always',
            'w-[22rem]',
            'sm:w-[23rem]',
            'md:w-[24rem]',
          )
        : cn(
            'flex-none',
            snapSlides && 'snap-start snap-always',
            'w-full',
            'sm:w-[calc((100%-0.75rem)/2)]',
            'lg:w-[calc((100%-2rem)/3)]',
          );

    const showArrows = showToolbarArrows && n > 1;
    const showToolbar = Boolean(headerStart) || showArrows;

    return (
      <div className={cn('relative flex w-full flex-col', className)}>
        {showToolbar ? (
          <div className="mb-3 flex w-full min-w-0 shrink-0 items-center gap-3">
            {headerStart ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">{headerStart}</div>
            ) : (
              <div className="min-w-0 flex-1" aria-hidden />
            )}
            {showArrows ? (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label="Scroll stories left"
                  onClick={() => scrollByStep(-1)}
                  className="border-2 border-border bg-card p-2 text-foreground"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                </button>

                <button
                  type="button"
                  aria-label="Scroll stories right"
                  onClick={() => scrollByStep(1)}
                  className="border-2 border-border bg-card p-2 text-foreground"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          ref={scrollerRef}
          className={cn(
            'ss-scrollbar-hide flex min-h-0 flex-1 flex-nowrap gap-3 overflow-x-auto overflow-y-hidden',
            snapSlides && 'snap-x snap-mandatory',
            'scroll-smooth',
            'pb-2',
          )}
          role="region"
          aria-label={ariaLabel}
        >
          {posts.map((post, i) => (
            <div
              key={post.id}
              className={slideCn}
              onFocusCapture={() => setIndex(i)}
            >
              <div className="h-full w-full">
                <BlogCard
                  post={post}
                  className="h-full w-full"
                />
              </div>
            </div>
          ))}
        </div>

        {showPagination && n > 1 ? (
          <div className="mt-auto flex shrink-0 justify-center gap-2 pt-4">
            {posts.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={`Go to story ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => {
                  const slide =
                    scrollerRef.current?.children.item(
                      i,
                    ) as HTMLElement | undefined;

                  slide?.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'start',
                    block: 'nearest',
                  });

                  setIndex(i);
                }}
                className={cn(
                  'size-2  border border-border transition-[transform,background-color]',
                  i === index
                    ? 'scale-125 bg-primary border-primary'
                    : 'bg-muted hover:bg-muted-foreground/50',
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  },
);

CompactBlogPostsSwiper.displayName = 'CompactBlogPostsSwiper';
