'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { CalendarDays, Pin, PinOff, Share2 } from 'lucide-react';
import { BlogCardEngagementRail } from './_blogCardEngagement';
import { BlogCardOwnerActionsOverlay, type BlogCardOwnerActions } from './_blogCardOwnerActions';
import { BlogPostAuthor } from './BlogPostAuthor';
import { PrimaryCoverFallback } from '@/lib/shell/primaryCoverFallback';
import { cn } from '@/lib/core/utils';
import type { Post } from '@/types';

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
  const mon =
    ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][
      d.getMonth()
    ] ?? '';
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

/** Squad detail feed only: pinned ribbon + admin pin control (parent owns confirm dialog). */
export type SquadFeedPinChrome = Readonly<{
  isPinned: boolean;
  canModerate: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
}>;

/** Squad detail feed only: shared-post ribbon on the cover image. */
export type SquadFeedShareChrome = Readonly<{
  sharedBy: {
    username: string;
    fullName?: string;
    profileImg?: string;
  };
}>;

function squadShareAvatarSrc(profileImg: string | undefined, username: string): string | null {
  const trimmed = profileImg?.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return `${base.replace(/\/$/, '')}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export type { BlogCardOwnerActions };

export type BlogCardProps = Readonly<{
  post: Post;
  showSocialActions?: boolean;
  suppressChromeHover?: boolean;
  className?: string;
  /** Profile owner grid: View / Edit / Delete (or restore/purge) on hover. */
  ownerActions?: BlogCardOwnerActions;
  /** When set (squad page), shows top-left PINNED tab and optional admin pin button on hover. */
  squadFeedPin?: SquadFeedPinChrome;
  /** When set (squad page), shows shared-to-squad label + sharer badge on the cover. */
  squadFeedShare?: SquadFeedShareChrome;
}>;

const RETRO_SHADOW = 'shadow-[4px_4px_0_0_var(--border)]';
const RETRO_BORDER = 'border-[3px] border-border';

export function BlogCard({
  post,
  showSocialActions = true,
  suppressChromeHover: suppressChromeHoverProp = false,
  className,
  ownerActions,
  squadFeedPin,
  squadFeedShare,
}: BlogCardProps) {
  const suppressChromeHover = ownerActions ? true : suppressChromeHoverProp;
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

  const authorFocusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  const authorAvatarClass = cn('h-8 w-8 shrink-0  border-2 border-border object-cover');

  const authorAvatarEl = post.author.image ? (
    <img src={post.author.image} alt="" className={authorAvatarClass} />
  ) : (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-border bg-muted text-[10px] font-black uppercase text-muted-foreground"
      aria-hidden
    >
      {(post.author.name || username).slice(0, 1)}
    </div>
  );

  const authorNameClass = cn(
    'min-w-0 truncate text-[10px] font-bold uppercase tracking-wide text-foreground',
    !suppressChromeHover && 'transition-colors duration-200',
    !suppressChromeHover &&
      (feedAuthor
        ? 'group-hover/blog-author-popover:text-primary'
        : 'group-hover/author-facelink:text-primary')
  );

  const authorPostLinkClass = cn(
    'flex min-w-0 flex-1 items-center gap-2 overflow-hidden ',
    authorFocusRing,
    !feedAuthor && 'group/author-facelink'
  );

  const authorDateRow = ageLabel ? (
    <span className="flex w-full min-w-0 items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
      <CalendarDays
        className="h-2.5 w-2.5 shrink-0 text-foreground/55"
        strokeWidth={2.25}
        aria-hidden
      />
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
        'group flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden bg-card text-card-foreground',
        (squadFeedPin || ownerActions) && 'relative',
        ownerActions && 'group/card',
        RETRO_BORDER,
        RETRO_SHADOW,
        className
      )}
    >
      {squadFeedPin?.isPinned ? (
        <span
          className="absolute left-0 top-0 z-[25] bg-orange-500 px-2.5 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-white shadow-sm"
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
            squadFeedPin.isPinned && 'opacity-100'
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
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <PrimaryCoverFallback variant="blog" />
              )}
              {squadFeedShare ? (
                <span
                  className="pointer-events-none absolute left-2 top-2 z-10 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 border-2 border-white/90 bg-black/70 px-1.5 py-1 shadow-sm backdrop-blur-[2px] sm:left-2.5 sm:top-2.5"
                  aria-label={`Shared to squad by ${squadFeedShare.sharedBy.username}`}
                  title="Shared to squad"
                >
                  <Share2
                    className="size-4 shrink-0 text-white"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  {(() => {
                    const uname = squadFeedShare.sharedBy.username;
                    const avatarSrc = squadShareAvatarSrc(
                      squadFeedShare.sharedBy.profileImg,
                      uname
                    );
                    const label = squadFeedShare.sharedBy.fullName?.trim() || uname;
                    return avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt=""
                        className="size-6 shrink-0 border border-white/80 object-cover"
                      />
                    ) : (
                      <span
                        className="flex size-6 shrink-0 items-center justify-center border border-white/80 bg-white/15 font-mono text-[9px] font-black uppercase text-white"
                        aria-hidden
                      >
                        {label.slice(0, 1)}
                      </span>
                    );
                  })()}
                  <span className="min-w-0 truncate font-mono text-[9px] font-bold uppercase tracking-wide text-white">
                    @{squadFeedShare.sharedBy.username}
                  </span>
                </span>
              ) : null}
            </div>
          </div>

          <div className={cn('flex w-full shrink-0 items-center justify-between gap-3 pb-2.5')}>
            <span className="inline-flex min-w-0 max-w-[min(100%,16rem)] items-center border-2 border-primary bg-primary px-2 py-0.5 font-sans text-[9px] font-black uppercase tracking-wide text-white shadow-none">
              <span className="truncate">{categoryLabel.toUpperCase()}</span>
            </span>
            <span
              className={cn(
                'shrink-0 font-mono text-[8px] font-bold tabular-nums text-muted-foreground',
                !suppressChromeHover &&
                  'transition-colors duration-200 group-hover:text-foreground/80'
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

          {showSocialActions ? <BlogCardEngagementRail post={post} /> : null}
        </div>
      </div>
      {ownerActions?.mode === 'deleted' ? (
        <p className="border-t-2 border-border bg-muted/20 px-3 py-1.5 font-mono text-[9px] text-muted-foreground">
          {ownerActions.deletedMeta}
        </p>
      ) : null}
      {ownerActions ? <BlogCardOwnerActionsOverlay actions={ownerActions} /> : null}
    </article>
  );
}
