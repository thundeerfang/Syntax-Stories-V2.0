'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Newspaper,
  Repeat2,
  Share2,
  CalendarDays,
  UsersRound,
  Pin,
  PinOff,
} from 'lucide-react';
import { blogApi } from '@/api/blog';
import { BlogPostAuthor } from '@/components/blog/BlogPostAuthor';
import { BookmarkLottie, SparkLottie } from '@/components/ui';
import { useAuthDialogStore } from '@/store/authDialog';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import type { Post } from '@/types';
import { toast } from 'sonner';
import { BlogCardSquadChip } from '@/components/blog/BlogCardSquadChip';
import { ShareToSquadDialog } from '@/components/squads/ShareToSquadDialog';

function formatCalendarDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function relativeTimeLabel(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return formatCalendarDate(iso);
}

/** Short calendar for narrow rails — avoids two-line wraps from long month names. */
function formatBlogCardAgeShortCalendar(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][d.getMonth()] ?? '';
  const day = d.getDate();
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  return `${mon} ${day} '${yy}`;
}

/** Compact age from backend `publishedAt`: days / hours / minutes / seconds when relevant. */
function formatBlogCardAge(iso: string): string {
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return '';
  let diff = Math.max(0, Date.now() - t);
  let secTotal = Math.floor(diff / 1000);
  if (secTotal < 45) return 'JUST NOW';

  const days = Math.floor(secTotal / 86400);
  secTotal %= 86400;
  const hours = Math.floor(secTotal / 3600);
  secTotal %= 3600;
  const minutes = Math.floor(secTotal / 60);
  const seconds = secTotal % 60;

  if (days >= 365) {
    return formatBlogCardAgeShortCalendar(iso);
  }

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}D`);
  if (hours > 0) parts.push(`${hours}H`);
  if (minutes > 0) parts.push(`${minutes}M`);
  if (seconds > 0) parts.push(`${seconds}S`);

  if (parts.length === 0) return 'JUST NOW';
  return `${parts.join(' ')} AGO`;
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

/** Category badge: slug/tag derived. */
function retroCategoryLabel(post: Post): string {
  if (post.category?.trim()) return titleCaseFromSlug(post.category.trim());
  const t = post.tags?.find((x) => typeof x === 'string' && x.trim());
  if (t) return t.trim().charAt(0).toUpperCase() + t.trim().slice(1).toLowerCase();
  const fromSlug = slugToTagChips(post.slug, 1)[0];
  if (fromSlug) return titleCaseFromSlug(fromSlug);
  return 'Blog';
}

function readMinutesForCard(post: Post): number {
  const v = post.readTimeMinutes;
  if (typeof v === 'number' && Number.isFinite(v) && v >= 1) return Math.min(999, Math.round(v));
  const words = post.excerpt.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Capitalize the first letter of each word; leaves the rest unchanged (preserves MongoDB, API, etc.). */
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

function formatEngagementCount(n: number): string {
  if (n > 99) return '99+';
  return String(Math.max(0, n));
}

function EngagementDivider() {
  return (
    <span
      className="h-3 w-px shrink-0 self-center bg-muted-foreground/15"
      aria-hidden
    />
  );
}

function EngagementActiveDot() {
  return (
    <span
      className="absolute -right-0.5 -top-0.5 z-10 size-2 rounded-full border border-card bg-primary"
      aria-hidden
    />
  );
}

/** Squad detail feed only: pinned ribbon + admin pin control (parent owns confirm dialog). */
export type SquadFeedPinChrome = Readonly<{
  isPinned: boolean;
  canModerate: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
}>;

export type BlogCardProps = Readonly<{
  post: Post;
  showSocialActions?: boolean;
  suppressChromeHover?: boolean;
  className?: string;
  /** When set (squad page), shows top-left PINNED tab and optional admin pin button on hover. */
  squadFeedPin?: SquadFeedPinChrome;
}>;

const RETRO_SHADOW = 'shadow-[4px_4px_0_0_var(--border)]';
const RETRO_BORDER = 'border-[3px] border-border';

/** Borderless icon rail — counts sit inline in muted tabular text. */
const ACTION_BTN_CLASS = cn(
  'relative inline-flex shrink-0 items-center overflow-visible rounded-none border-0 bg-transparent',
  'gap-1 text-foreground/75 transition-colors hover:bg-muted/55 hover:text-foreground',
  'h-8 min-h-8 px-0.5',
);

const ACTION_COUNT_CLASS = cn(
  'min-w-[0.75rem] font-mono tabular-nums text-muted-foreground/45',
  'text-[8px]',
);

export function BlogCard({
  post,
  showSocialActions = true,
  suppressChromeHover = false,
  className,
  squadFeedPin,
}: BlogCardProps) {
  const username = post.author.username ?? post.author.id;
  const slug = post.slug;
  const href = `/blogs/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
  const authorUsernameTrimmed = post.author.username?.trim() ?? '';
  const feedAuthor = authorUsernameTrimmed
    ? {
        username: authorUsernameTrimmed,
        fullName: post.author.name,
        profileImg: post.author.image ?? '',
      }
    : null;
  const whenRelative = relativeTimeLabel(post.publishedAt);
  const ageLabel = formatBlogCardAge(post.publishedAt);
  const categoryLabel = retroCategoryLabel(post);
  const readM = readMinutesForCard(post);
  const displayTitle = titleCaseEveryWord(post.title);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [titleIsTwoLines, setTitleIsTwoLines] = useState(false);

  const token = useAuthStore((s) => s.token);
  const openAuthDialog = useAuthDialogStore((s) => s.open);

  const [respecting, setRespecting] = useState(post.viewerHasRespected === true);
  const [respectCount, setRespectCount] = useState(post.respectCount ?? 0);
  const [reposting, setReposting] = useState(post.viewerHasReposted === true);
  const [repostCount, setRepostCount] = useState(post.repostCount ?? 0);
  const [bookmarked, setBookmarked] = useState(post.viewerHasBookmarked === true);
  const [bookmarkCount, setBookmarkCount] = useState(post.bookmarkCount ?? 0);
  const [busy, setBusy] = useState<'respect' | 'repost' | 'bookmark' | null>(null);
  const [squadShareOpen, setSquadShareOpen] = useState(false);

  const stateRef = useRef({
    respecting: post.viewerHasRespected === true,
    reposting: post.viewerHasReposted === true,
    bookmarked: post.viewerHasBookmarked === true,
  });
  useEffect(() => {
    stateRef.current = { respecting, reposting, bookmarked };
  }, [respecting, reposting, bookmarked]);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const lhRaw = cs.lineHeight;
      const fontSize = parseFloat(cs.fontSize) || 16;
      const lh =
        lhRaw === 'normal' || !Number.isFinite(parseFloat(lhRaw))
          ? fontSize * 1.25
          : parseFloat(lhRaw);
      if (!Number.isFinite(lh) || lh <= 0) {
        setTitleIsTwoLines(false);
        return;
      }
      const lines = Math.ceil(el.scrollHeight / lh);
      setTitleIsTwoLines(lines >= 2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [displayTitle]);

  useEffect(() => {
    setRespecting(post.viewerHasRespected === true);
    setRespectCount(post.respectCount ?? 0);
    setReposting(post.viewerHasReposted === true);
    setRepostCount(post.repostCount ?? 0);
    setBookmarked(post.viewerHasBookmarked === true);
    setBookmarkCount(post.bookmarkCount ?? 0);
  }, [
    post.id,
    post.viewerHasRespected,
    post.respectCount,
    post.viewerHasReposted,
    post.repostCount,
    post.viewerHasBookmarked,
    post.bookmarkCount,
  ]);

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
    const wantOn = !stateRef.current.respecting;
    setBusy('respect');
    try {
      const r = await blogApi.setPostRespect(username, slug, wantOn, t);
      setRespecting(r.respecting);
      setRespectCount(r.respectCount);
      if (wantOn && !r.respecting) {
        toast.info('You can’t Respect your own post.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update Respect');
    } finally {
      setBusy(null);
    }
  }, [requireToken, username, slug]);

  const toggleRepost = useCallback(async () => {
    const t = requireToken();
    if (!t) return;
    const wantOn = !stateRef.current.reposting;
    setBusy('repost');
    try {
      const r = await blogApi.setPostRepost(username, slug, wantOn, t);
      setReposting(r.reposting);
      setRepostCount(r.repostCount);
      if (wantOn && !r.reposting) {
        toast.info('You can’t Repost your own post.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update repost');
    } finally {
      setBusy(null);
    }
  }, [requireToken, username, slug]);

  const toggleBookmark = useCallback(async () => {
    const t = requireToken();
    if (!t) return;
    const wantOn = !stateRef.current.bookmarked;
    setBusy('bookmark');
    try {
      const r = await blogApi.setPostBookmark(username, slug, wantOn, t);
      setBookmarked(r.bookmarked);
      setBookmarkCount(r.bookmarkCount);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update bookmark');
    } finally {
      setBusy(null);
    }
  }, [requireToken, username, slug]);

  const sharePost = useCallback(() => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/blogs/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`
        : '';
    const title = post.title;
    if (navigator.share) {
      void navigator.share({ title, url }).catch(() => {
        void navigator.clipboard.writeText(url).then(() => toast.success('Link copied'));
      });
    } else {
      void navigator.clipboard.writeText(url).then(() => toast.success('Link copied'));
    }
  }, [username, slug, post.title]);

  const openSquadShare = useCallback(() => {
    if (!post.id) return;
    if (!token) {
      openAuthDialog('login');
      return;
    }
    setSquadShareOpen(true);
  }, [post.id, token, openAuthDialog, setSquadShareOpen]);

  const [hoverRespect, setHoverRespect] = useState(false);
  const [hoverBookmark, setHoverBookmark] = useState(false);

  const iconBox = 'h-[18px] w-[18px]';
  const lottieSize = 18;

  const authorFocusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  const authorAvatarClass = cn('h-8 w-8 shrink-0 rounded-none border-2 border-border object-cover');

  const authorAvatarEl = post.author.image ? (
    <img src={post.author.image} alt="" className={authorAvatarClass} />
  ) : (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none border-2 border-border bg-muted text-[10px] font-black uppercase text-muted-foreground"
      aria-hidden
    >
      {(post.author.name || username).slice(0, 1)}
    </div>
  );

  const authorNameClass = cn(
    'min-w-0 truncate text-[10px] font-bold uppercase tracking-wide text-foreground',
    !suppressChromeHover && 'transition-colors duration-200',
    !suppressChromeHover && (feedAuthor ? 'group-hover/blog-author-popover:text-primary' : 'group-hover/author-facelink:text-primary'),
  );

  const authorPostLinkClass = cn(
    'flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-sm',
    authorFocusRing,
    !feedAuthor && 'group/author-facelink',
  );

  const authorDateRow =
    ageLabel ? (
      <span className="flex w-full min-w-0 items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
        <CalendarDays className="h-2.5 w-2.5 shrink-0 text-foreground/55" strokeWidth={2.25} aria-hidden />
        <time className="min-w-0 flex-1 truncate whitespace-nowrap" dateTime={post.publishedAt}>
          {ageLabel}
        </time>
      </span>
    ) : (
      <span className="flex w-full min-w-0 items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <time className="min-w-0 flex-1 truncate whitespace-nowrap" dateTime={post.publishedAt}>
          {whenRelative}
        </time>
      </span>
    );

  return (
    <article
      className={cn(
        'group flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden rounded-none bg-card text-card-foreground',
        squadFeedPin && 'relative',
        RETRO_BORDER,
        RETRO_SHADOW,
        className,
      )}
    >
      {squadFeedPin?.isPinned ? (
        <span
          className="absolute left-0 top-0 z-[25] rounded-br-md rounded-tr-sm bg-orange-500 px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-white shadow-sm"
          aria-label="Pinned in squad"
        >
          Pinned
        </span>
      ) : null}
      {squadFeedPin?.canModerate ? (
        <button
          type="button"
          title={squadFeedPin.isPinned ? 'Unpin from squad' : 'Pin to squad top'}
          aria-label={squadFeedPin.isPinned ? 'Unpin post' : 'Pin post'}
          className={cn(
            'absolute right-2 top-2 z-[25] flex size-9 items-center justify-center border-2 border-border bg-card text-foreground shadow-[2px_2px_0_0_var(--border)] transition-opacity',
            'hover:border-primary hover:text-primary',
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card',
            squadFeedPin.isPinned && 'opacity-100',
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (squadFeedPin.isPinned) squadFeedPin.onUnpin?.();
            else squadFeedPin.onPin?.();
          }}
        >
          {squadFeedPin.isPinned ? (
            <PinOff className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
          ) : (
            <Pin className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
          )}
        </button>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:gap-2 sm:p-2.5">
        <Link
          href={href}
          className="flex min-h-0 w-full shrink-0 flex-col gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="-mx-2 -mt-2 w-[calc(100%+1rem)] shrink-0 overflow-hidden sm:-mx-2.5 sm:-mt-2.5 sm:w-[calc(100%+1.25rem)]">
            <div className="relative h-[160px] w-full overflow-hidden border-b-[3px] border-border bg-muted/15 sm:h-[178px]">
              {post.coverImage ? (
                <img src={post.coverImage} alt={post.title} className="h-full w-full object-cover object-center" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-linear-to-br from-muted to-background">
                  <Newspaper className="h-6 w-6 text-muted-foreground/70" strokeWidth={2.5} aria-hidden />

                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    No Cover Image
                  </span>
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              'flex w-full shrink-0 items-center justify-between gap-3 pb-2.5',
            )}
          >
            <span className="inline-flex min-w-0 max-w-[min(100%,16rem)] items-center rounded-none border-2 border-primary bg-primary px-2 py-0.5 font-sans text-[9px] font-black uppercase tracking-wide text-white shadow-none">
              <span className="truncate">{categoryLabel.toUpperCase()}</span>
            </span>
            <span
              className={cn(
                'shrink-0 font-mono text-[8px] font-bold tabular-nums text-muted-foreground',
                !suppressChromeHover && 'transition-colors duration-200 group-hover:text-foreground/80',
              )}
            >
              {readM} min
            </span>
          </div>

          <h2
            ref={titleRef}
            className="line-clamp-2 text-[15px] font-black leading-[1.25] tracking-tight text-foreground sm:text-[16px]"
          >
            {displayTitle}
          </h2>
        </Link>

        {/* Author + actions — order: Respect, Repost, Bookmark, Share */}
        <div className={cn('flex min-h-0 items-center gap-2', titleIsTwoLines ? 'pt-2' : 'pt-1')}>
          <div className="flex min-h-0 min-w-0 flex-1 items-center">
            {feedAuthor ? (
              <BlogPostAuthor author={feedAuthor} className="flex min-w-0 flex-1">
                <Link href={href} className={authorPostLinkClass}>
                  {authorAvatarEl}
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0 leading-tight">
                    <span className={authorNameClass}>
                      {(post.author.name?.trim() || username).toUpperCase()}
                    </span>
                    {authorDateRow}
                  </div>
                </Link>
              </BlogPostAuthor>
            ) : (
              <Link href={href} className={authorPostLinkClass}>
                {authorAvatarEl}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0 leading-tight">
                  <span className={authorNameClass}>
                    {(post.author.name?.trim() || username).toUpperCase()}
                  </span>
                  {authorUsernameTrimmed && post.author.name?.trim() ? (
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      @{authorUsernameTrimmed.toUpperCase()}
                    </span>
                  ) : null}
                  {authorDateRow}
                </div>
              </Link>
            )}
          </div>

          {showSocialActions ? (
            <div className="flex shrink-0 items-center gap-0 sm:gap-0.5">
              {/* Respect */}
              <button
                type="button"
                disabled={busy !== null}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void toggleRespect();
                }}
                onMouseEnter={() => setHoverRespect(true)}
                onMouseLeave={() => setHoverRespect(false)}
                aria-label={`${respecting ? 'Respecting' : 'Respect'} (${formatEngagementCount(respectCount)})`}
                aria-pressed={respecting}
                title="Respect"
                className={cn(
                  ACTION_BTN_CLASS,
                  respecting && 'text-primary',
                  busy === 'respect' && 'opacity-60',
                )}
              >
                <span className={cn('relative inline-flex shrink-0 items-center justify-center', iconBox)}>
                  {hoverRespect ? (
                    <SparkLottie play size={lottieSize} />
                  ) : (
                    <img
                      src="/svg/icons8-lightning-bolt.svg"
                      alt=""
                      className={cn(
                        'h-4 w-4 object-contain',
                        respecting && 'drop-shadow-[0_0_6px_color-mix(in_srgb,var(--primary)_55%,transparent)]',
                      )}
                      aria-hidden
                    />
                  )}
                  {respecting ? <EngagementActiveDot /> : null}
                </span>
                <span className={ACTION_COUNT_CLASS}>{formatEngagementCount(respectCount)}</span>
              </button>

              <EngagementDivider />

              {/* Repost */}
              <button
                type="button"
                disabled={busy !== null}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void toggleRepost();
                }}
                aria-label={`${reposting ? 'Reposted' : 'Repost'} (${formatEngagementCount(repostCount)})`}
                aria-pressed={reposting}
                title="Repost"
                className={cn(
                  ACTION_BTN_CLASS,
                  reposting && 'text-primary',
                  busy === 'repost' && 'opacity-60',
                )}
              >
                <span className={cn('relative inline-flex shrink-0 items-center justify-center', iconBox)}>
                  <Repeat2
                    className={cn('h-3.5 w-3.5', reposting && 'text-primary')}
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  {reposting ? <EngagementActiveDot /> : null}
                </span>
                <span className={ACTION_COUNT_CLASS}>{formatEngagementCount(repostCount)}</span>
              </button>

              <EngagementDivider />

              {/* Bookmark */}
              <button
                type="button"
                disabled={busy !== null}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void toggleBookmark();
                }}
                onMouseEnter={() => setHoverBookmark(true)}
                onMouseLeave={() => setHoverBookmark(false)}
                aria-label={`${bookmarked ? 'Saved' : 'Bookmark'} (${formatEngagementCount(bookmarkCount)})`}
                aria-pressed={bookmarked}
                title="Bookmark"
                className={cn(
                  ACTION_BTN_CLASS,
                  bookmarked && 'text-primary',
                  busy === 'bookmark' && 'opacity-60',
                )}
              >
                <span className={cn('relative inline-flex shrink-0 items-center justify-center', iconBox)}>
                  {hoverBookmark ? (
                    <BookmarkLottie play size={lottieSize} />
                  ) : (
                    <Bookmark
                      className={cn('h-3.5 w-3.5', bookmarked ? 'fill-primary text-primary' : '')}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  )}
                  {bookmarked ? <EngagementActiveDot /> : null}
                </span>
                <span className={ACTION_COUNT_CLASS}>{formatEngagementCount(bookmarkCount)}</span>
              </button>

              <EngagementDivider />

              {post.id ? (
                <>
                  {post.squad ? (
                    <>
                      <BlogCardSquadChip squad={post.squad} />
                      <EngagementDivider />
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openSquadShare();
                        }}
                        aria-label="Share to squad"
                        title="Share to squad"
                        className={cn(ACTION_BTN_CLASS, 'gap-0')}
                      >
                        <span className={cn('relative inline-flex shrink-0 items-center justify-center', iconBox)}>
                          <UsersRound className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                        </span>
                      </button>
                      <EngagementDivider />
                    </>
                  )}
                </>
              ) : null}

              {/* Share — no server count */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  sharePost();
                }}
                aria-label="Share"
                title="Share"
                className={cn(ACTION_BTN_CLASS, 'gap-0')}
              >
                <span className={cn('relative inline-flex shrink-0 items-center justify-center', iconBox)}>
                  <Share2 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {token && post.id && !post.squad ? (
        <ShareToSquadDialog
          open={squadShareOpen}
          onClose={() => setSquadShareOpen(false)}
          accessToken={token}
          postId={post.id}
        />
      ) : null}
    </article>
  );
}
