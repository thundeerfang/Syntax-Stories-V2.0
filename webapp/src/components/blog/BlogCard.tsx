import Link from 'next/link';
import { Bookmark, MessageCircle, Newspaper, Share2, Heart, Timer, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Post } from '@/types';

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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function estimateReadMinutes(excerpt: string, title: string): number {
  const words = `${title} ${excerpt}`.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.min(45, Math.round(words / 200)));
}

/** Slug → hashtag-style chips for the cover badge */
function slugToTagChips(slug: string, maxTags = 1): string[] {
  const parts = slug.split('-').filter((p) => p.length > 1);
  const chips = parts.slice(0, maxTags).map((p) => (p.length > 14 ? `${p.slice(0, 12)}…` : p));
  return chips;
}

export type BlogCardProps = Readonly<{
  post: Post;
  /** Bookmark / share row (home feed). Off for public profile grids. */
  showSocialActions?: boolean;
  /**
   * When this matches the post author's `username`, show "Edited …" if `lastEditedAt` is set.
   * Omit or leave null for readers — they won't see edit metadata.
   */
  viewerUsername?: string | null;
  /** Shorter cover + tighter body for dashboard grids. */
  density?: 'default' | 'compact';
  /** Activity grids: disable lift/shadow and cover zoom on hover. */
  suppressChromeHover?: boolean;
  className?: string;
}>;

export function BlogCard({
  post,
  showSocialActions = true,
  viewerUsername = null,
  density = 'default',
  suppressChromeHover = false,
  className,
}: BlogCardProps) {
  const username = post.author.username ?? post.author.id;
  const href = `/blogs/${encodeURIComponent(username)}/${encodeURIComponent(post.slug)}`;
  const when = relativeTimeLabel(post.publishedAt);
  const readMin = estimateReadMinutes(post.excerpt ?? '', post.title);
  const tagChips = slugToTagChips(post.slug, 1);
  const excerpt = (post.excerpt ?? '').trim();
  const showEditedMeta = Boolean(
    viewerUsername &&
      post.author.username &&
      viewerUsername === post.author.username &&
      post.lastEditedAt?.trim(),
  );
  const editedAt = post.lastEditedAt?.trim();
  const editedWhen = editedAt ? relativeTimeLabel(editedAt) : null;
  const editorName = post.lastEditedBy?.fullName ?? post.lastEditedBy?.username;

  const compact = density === 'compact';

  return (
    <article
      className={cn(
        'group flex h-full min-h-0 w-full flex-col overflow-hidden rounded-none border-2 border-border bg-card shadow-[6px_6px_0_0_var(--border)]',
        !suppressChromeHover &&
          'transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[8px_8px_0_0_var(--border)]',
        !compact && 'min-h-[200px]',
        className,
      )}
    >
      <Link href={href} className="flex h-full min-h-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        {/* Cover — wide, low height on compact grids */}
        <div className="relative shrink-0 border-b-2 border-border">
          <div
            className={cn(
              'w-full overflow-hidden bg-muted',
              compact ? 'aspect-[21/9] max-h-[96px] sm:max-h-[110px]' : 'aspect-[2/1] max-h-[200px] sm:max-h-[220px]',
            )}
          >
            {post.coverImage ? (
              <img
                src={post.coverImage}
                alt=""
                className={cn(
                  'h-full w-full object-cover',
                  !suppressChromeHover && 'transition-transform duration-300 group-hover:scale-[1.02]',
                )}
              />
            ) : (
              <div
                className={cn(
                  'flex h-full w-full flex-col items-center justify-center gap-1 bg-linear-to-br from-muted to-background p-4',
                  compact ? 'min-h-[72px]' : 'min-h-[100px]',
                )}
              >
                <Newspaper className={cn('text-muted-foreground/70', compact ? 'h-6 w-6' : 'h-8 w-8')} aria-hidden />
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  No cover
                </span>
              </div>
            )}
          </div>
          {tagChips.length > 0 ? (
            <span className="absolute left-2 top-2 border-2 border-border bg-background px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wide text-foreground shadow-[2px_2px_0_0_var(--border)]">
              {tagChips[0]}
            </span>
          ) : null}
        </div>

        <div className={cn('flex min-h-0 flex-1 flex-col', compact ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4')}>
          {/* Author row */}
          <div
            className={cn(
              'flex items-center gap-2.5 border-b border-border/60',
              compact ? 'pb-1.5' : 'pb-2.5',
            )}
          >
            {post.author.image ? (
              <img
                src={post.author.image}
                alt=""
                className={cn(
                  'shrink-0 rounded-full border-2 border-border object-cover',
                  compact ? 'h-7 w-7' : 'h-9 w-9',
                )}
              />
            ) : (
              <div
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full border-2 border-border bg-muted font-bold uppercase text-muted-foreground',
                  compact ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-[11px]',
                )}
                aria-hidden
              >
                {(post.author.name || username).slice(0, 1)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className={cn('truncate font-bold leading-tight text-foreground', compact ? 'text-[12px]' : 'text-[13px]')}>
                by {post.author.name}
              </p>
              <p className="truncate font-mono text-[10px] text-muted-foreground sm:text-[11px]">
                <time dateTime={post.publishedAt}>{when}</time>
              </p>
            </div>
          </div>

          {/* Stats row — read time · relative */}
          <div
            className={cn(
              'mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-border/40 font-mono text-[9px] text-muted-foreground sm:text-[10px]',
              compact ? 'pb-1' : 'pb-2',
            )}
          >
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              <span className="opacity-80">—</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Timer className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              {when}
            </span>
            <span className="inline-flex items-center gap-1">
              <BarChart3 className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              {readMin} min read
            </span>
          </div>

          <h2
            className={cn(
              'mt-1.5 line-clamp-2 font-black uppercase leading-snug tracking-tight text-foreground',
              compact ? 'text-[13px] sm:text-sm' : 'text-[15px] sm:text-base',
            )}
          >
            {post.title}
          </h2>

          {excerpt ? (
            <p
              className={cn(
                'mt-1 line-clamp-2 text-muted-foreground leading-relaxed',
                compact ? 'text-[11px]' : 'line-clamp-3 text-[12px]',
              )}
            >
              {excerpt}
            </p>
          ) : null}

          {showEditedMeta && editedWhen ? (
            <p className="mt-1.5 border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-amber-950 dark:text-amber-100 sm:text-[9px]">
              Edited <span className="font-mono normal-case">{editedWhen}</span>
              {editorName ? <span> · {editorName}</span> : null}
            </p>
          ) : null}

          {showSocialActions ? (
            <div
              className={cn(
                'mt-auto flex items-center justify-between border-t-2 border-border text-muted-foreground',
                compact ? 'pt-2' : 'pt-3',
              )}
            >
              <div className="flex items-center gap-3">
                <Bookmark className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
                <MessageCircle className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
              </div>
              <Share2 className="h-4 w-4 opacity-60 transition-opacity group-hover:text-primary group-hover:opacity-100" aria-hidden />
            </div>
          ) : (
            <div className={cn('border-t border-border/50', compact ? 'mt-2 pt-0.5' : 'mt-3 pt-1')} aria-hidden />
          )}
        </div>
      </Link>
    </article>
  );
}
