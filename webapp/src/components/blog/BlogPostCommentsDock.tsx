'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, MessageSquare, Repeat2 } from 'lucide-react';
import { blogApi } from '@/api/blog';
import { BookmarkLottie } from '@/components/ui/BookmarkLottie';
import { SparkLottie } from '@/components/ui/SparkLottie';
import { SHELL_RAIL_FROST_CLASS, SHELL_RAIL_FROST_STYLE } from '@/lib/shellContentRail';
import { cn } from '@/lib/utils';
import { useAuthDialogStore } from '@/store/authDialog';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

const COMPOSER_ANCHOR_ID = 'blog-comment-composer-anchor';
const COMMENTS_SECTION_ID = 'blog-comments-section';
const FOOTER_ID = 'app-footer';
const BASE_BOTTOM_GAP_PX = 10;
const FOOTER_LIFT_DEADBAND_PX = 1;

const dockLabelClass = 'whitespace-nowrap font-mono text-[10px] font-black uppercase tracking-tight';

function DockCountBubble({ count, loading }: Readonly<{ count: number; loading?: boolean }>) {
  const text = loading ? '…' : count > 99 ? '99+' : String(count);
  return (
    <span
      className={cn(
        'absolute -right-2.5 -top-2 z-10 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border-2 border-border px-0.5',
        'bg-primary font-mono text-[8px] font-black tabular-nums leading-none text-primary-foreground shadow-[1px_1px_0_0_var(--border)]',
      )}
      aria-hidden
    >
      {text}
    </span>
  );
}

function DockActiveDot() {
  return (
    <span
      className="absolute -right-1 -top-1 z-10 size-2.5 rounded-full border-2 border-card bg-primary shadow-[1px_1px_0_0_var(--border)]"
      aria-hidden
    />
  );
}

function DockAction({
  label,
  icon,
  onClick,
  pressed,
  activeHighlight,
  softInactive,
  iconClassName,
  showActiveDot,
  badgeCount,
  badgeLoading,
}: Readonly<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  pressed?: boolean;
  activeHighlight?: boolean;
  softInactive?: boolean;
  iconClassName?: string;
  showActiveDot?: boolean;
  badgeCount?: number;
  badgeLoading?: boolean;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        'group relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 overflow-visible border-2 border-border px-2 sm:px-2.5',
        'font-mono text-[10px] font-black uppercase',
        'transition-colors duration-200 ease-in-out',
        activeHighlight
          ? 'border-primary bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--border)]'
          : pressed
            ? 'border-primary bg-primary/15 text-primary'
            : softInactive
              ? 'border-border bg-background/20 text-muted-foreground hover:bg-background/35 hover:text-foreground'
              : 'bg-background/25 text-foreground hover:bg-background/40',
      )}
    >
      <span className={cn('relative inline-flex shrink-0', iconClassName)}>
        {icon}
        {showActiveDot ? <DockActiveDot /> : null}
        {badgeCount !== undefined ? <DockCountBubble count={badgeCount} loading={badgeLoading} /> : null}
      </span>
      <span className={dockLabelClass}>{label}</span>
    </button>
  );
}

function BookmarkDockAction({
  bookmarked,
  bookmarkCount,
  onToggle,
}: Readonly<{
  bookmarked: boolean;
  bookmarkCount: number;
  onToggle: () => void;
}>) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Bookmark"
      aria-pressed={bookmarked}
      title="Bookmark"
      className={cn(
        'group relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 overflow-visible border-2 border-border px-2 sm:px-2.5',
        'font-mono text-[10px] font-black uppercase',
        'transition-colors duration-200 ease-in-out',
        bookmarked
          ? 'border-primary bg-primary/15 text-primary'
          : 'bg-background/25 text-foreground hover:bg-background/40',
      )}
    >
      <span className="relative inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center">
        {hover ? (
          <BookmarkLottie play size={22} />
        ) : (
          <Bookmark
            className={cn('h-5 w-5 shrink-0', bookmarked ? 'text-primary' : 'text-current')}
            strokeWidth={2.5}
            fill="none"
            aria-hidden
          />
        )}
        {bookmarked ? <DockActiveDot /> : null}
        <DockCountBubble count={bookmarkCount} />
      </span>
      <span className={dockLabelClass}>Bookmark</span>
    </button>
  );
}

function RespectDockAction({
  respected,
  respectCount,
  onToggle,
}: Readonly<{
  respected: boolean;
  respectCount: number;
  onToggle: () => void;
}>) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label="Respect"
      aria-pressed={respected}
      title="Respect"
      className={cn(
        'group relative inline-flex h-10 shrink-0 items-center justify-center gap-1.5 overflow-visible border-2 border-border px-2 sm:px-2.5',
        'font-mono text-[10px] font-black uppercase',
        'transition-colors duration-200 ease-in-out',
        respected
          ? 'border-primary bg-primary/15 text-primary'
          : 'bg-background/25 text-foreground hover:bg-background/40',
      )}
    >
      <span className="relative inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center">
        {hover ? (
          <SparkLottie play size={22} />
        ) : (
          <img
            src="/svg/icons8-lightning-bolt.svg"
            alt=""
            width={20}
            height={20}
            className={cn(
              'h-5 w-5 shrink-0 object-contain',
              respected && 'drop-shadow-[0_0_6px_color-mix(in_srgb,var(--primary)_55%,transparent)]',
            )}
            aria-hidden
          />
        )}
        {respected ? <DockActiveDot /> : null}
        <DockCountBubble count={respectCount} />
      </span>
      <span className={dockLabelClass}>Respect</span>
    </button>
  );
}

export type BlogDockEngagement = {
  respectCount: number;
  repostCount: number;
  bookmarkCount: number;
  viewCount: number;
  viewerHasRespected: boolean;
  viewerHasReposted: boolean;
  viewerHasBookmarked: boolean;
};

export function BlogPostCommentsDock({
  username,
  slug,
  commentCount = 0,
  commentCountLoading = false,
  engagement,
  onEngagementChange,
}: Readonly<{
  username: string;
  slug: string;
  commentCount?: number;
  commentCountLoading?: boolean;
  engagement: BlogDockEngagement;
  onEngagementChange: (next: BlogDockEngagement) => void;
}>) {
  const token = useAuthStore((s) => s.token);
  const openAuthDialog = useAuthDialogStore((s) => s.open);

  const [commentsInView, setCommentsInView] = useState(false);
  const [footerLiftPx, setFooterLiftPx] = useState(0);
  const footerLiftRef = useRef(0);
  /** Latest props for async toggles (avoids stale `engagement` after stats stream / parent updates). */
  const engagementRef = useRef(engagement);
  useEffect(() => {
    engagementRef.current = engagement;
  });

  useEffect(() => {
    const el = document.getElementById(COMMENTS_SECTION_ID);
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setCommentsInView(entry.isIntersecting);
      },
      { root: null, threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let rafId = 0;
    const syncFooterLift = () => {
      const footer = document.getElementById(FOOTER_ID);
      if (!footer) {
        if (footerLiftRef.current !== 0) {
          footerLiftRef.current = 0;
          setFooterLiftPx(0);
        }
        return;
      }
      const rect = footer.getBoundingClientRect();
      /**
       * `ceil` keeps the dock from ever dipping 1px into the footer due to sub-pixel layout.
       * We then add a tiny deadband to suppress noisy up/down updates near the contact edge.
       */
      const nextLift = Math.max(0, Math.ceil(window.innerHeight - rect.top));

      const prevLift = footerLiftRef.current;
      const diff = Math.abs(nextLift - prevLift);
      const shouldUpdate = nextLift === 0 || prevLift === 0 || diff >= FOOTER_LIFT_DEADBAND_PX;
      if (!shouldUpdate) return;
      footerLiftRef.current = nextLift;
      setFooterLiftPx(nextLift);
    };
    const onScrollOrResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(syncFooterLift);
    };
    syncFooterLift();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  const requireToken = useCallback(() => {
    if (!token) {
      openAuthDialog('login');
      return null;
    }
    return token;
  }, [token, openAuthDialog]);

  const toggleRespect = useCallback(async () => {
    const t = requireToken();
    if (!t) return;
    const prev = engagementRef.current;
    const wantOn = !prev.viewerHasRespected;
    try {
      const r = await blogApi.setPostRespect(username, slug, wantOn, t);
      onEngagementChange({
        ...prev,
        viewerHasRespected: r.respecting,
        respectCount: r.respectCount,
      });
      if (wantOn && !r.respecting) {
        toast.info('You can’t Respect your own post.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update Respect');
    }
  }, [requireToken, username, slug, onEngagementChange]);

  const toggleRepost = useCallback(async () => {
    const t = requireToken();
    if (!t) return;
    const prev = engagementRef.current;
    const wantOn = !prev.viewerHasReposted;
    try {
      const r = await blogApi.setPostRepost(username, slug, wantOn, t);
      onEngagementChange({
        ...prev,
        viewerHasReposted: r.reposting,
        repostCount: r.repostCount,
      });
      if (wantOn && !r.reposting) {
        toast.info('You can’t Repost your own post.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update repost');
    }
  }, [requireToken, username, slug, onEngagementChange]);

  const toggleBookmark = useCallback(async () => {
    const t = requireToken();
    if (!t) return;
    const prev = engagementRef.current;
    const wantOn = !prev.viewerHasBookmarked;
    try {
      const r = await blogApi.setPostBookmark(username, slug, wantOn, t);
      onEngagementChange({
        ...prev,
        viewerHasBookmarked: r.bookmarked,
        bookmarkCount: r.bookmarkCount,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update bookmark');
    }
  }, [requireToken, username, slug, onEngagementChange]);

  const scrollToComposer = () => {
    const el = document.getElementById(COMPOSER_ANCHOR_ID);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = el?.querySelector<HTMLElement>(
      'textarea, [contenteditable="true"], .ProseMirror',
    );
    window.setTimeout(() => focusable?.focus(), 400);
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-3 pt-2"
      style={{ bottom: `calc(${BASE_BOTTOM_GAP_PX}px + ${footerLiftPx}px + env(safe-area-inset-bottom, 0px))` }}
      role="toolbar"
      aria-label="Post engagement"
    >
      <div
        className={cn(
          'pointer-events-auto relative max-w-[min(100%,40rem)] overflow-hidden border border-border/45',
        )}
      >
        <div
          aria-hidden
          className={cn(SHELL_RAIL_FROST_CLASS, 'pointer-events-none absolute inset-0 z-0')}
          style={SHELL_RAIL_FROST_STYLE}
        />
        <div className="relative z-[1] flex flex-wrap items-center justify-center gap-1.5 overflow-visible px-2 py-2 sm:gap-2 sm:px-3">
          <RespectDockAction
            respected={engagement.viewerHasRespected}
            respectCount={engagement.respectCount}
            onToggle={() => void toggleRespect()}
          />

          <DockAction
            label="Repost"
            pressed={engagement.viewerHasReposted}
            onClick={() => void toggleRepost()}
            showActiveDot={engagement.viewerHasReposted}
            badgeCount={engagement.repostCount}
            icon={<Repeat2 className="h-4 w-4" strokeWidth={2.5} />}
          />

          <BookmarkDockAction
            bookmarked={engagement.viewerHasBookmarked}
            bookmarkCount={engagement.bookmarkCount}
            onToggle={() => void toggleBookmark()}
          />

          <DockAction
            label="Comment"
            activeHighlight={commentsInView}
            softInactive={!commentsInView}
            onClick={scrollToComposer}
            icon={<MessageSquare className="h-4 w-4" strokeWidth={2.5} />}
            badgeCount={commentCount}
            badgeLoading={commentCountLoading}
          />
        </div>
      </div>
    </div>
  );
}
