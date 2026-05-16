'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, Copy, Newspaper, Share2, UserPen } from 'lucide-react';
import { toast } from 'sonner';
import { BlogPostAuthor } from '@/components/blog/BlogPostAuthor';
import { BlockShadowButton } from '@/components/ui/BlockShadowButton';
import { FacebookIcon, InstagramIcon, LinkedinIcon } from '@/components/icons/SocialProviderIcons';
import { cn } from '@/lib/utils';
import type { PublicFeedPost, PublicFeedPostAuthor } from '@/types/blog';

const RAIL_CARD =
  'border-2 border-border bg-card p-4 shadow-[4px_4px_0_0_var(--border)]';

const AUTHOR_CARD = 'border border-dashed border-border bg-background p-4';

function WhatsAppIcon({ className }: Readonly<{ className?: string }>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const SOCIAL_ICON_BTN =
  'inline-flex size-10 items-center justify-center border-2 border-border bg-background text-foreground shadow-none transition-colors hover:border-primary hover:text-primary';

function authorAvatarSrc(author: PublicFeedPostAuthor): string {
  const u = author.profileImg?.trim();
  if (u) return u;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(author.username)}`;
}

function formatMoreByDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PostMiniList({
  posts,
  emptyLabel,
  loading,
}: Readonly<{
  posts: PublicFeedPost[];
  emptyLabel: string;
  loading?: boolean;
}>) {
  if (loading) {
    return (
      <ul className="m-0 list-none space-y-4 p-0" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <li key={`sk-${i}`} className="animate-pulse space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="size-8 shrink-0 rounded-full bg-muted" />
              <div className="h-3.5 flex-1 max-w-[8rem] rounded-sm bg-muted" />
            </div>
            <div className="h-3.5 w-full rounded-sm bg-muted/90" />
            <div className="h-3.5 w-4/5 rounded-sm bg-muted/80" />
            <div className="h-3 w-16 rounded-sm bg-muted/70" />
          </li>
        ))}
      </ul>
    );
  }
  if (posts.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-6 text-center"
        role="status"
      >
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary dark:bg-primary/20"
          aria-hidden
        >
          <Newspaper className="size-5" strokeWidth={2.25} />
        </div>
        <p className="m-0 max-w-[15rem] font-sans text-xs font-medium leading-relaxed text-muted-foreground">
          {emptyLabel}
        </p>
      </div>
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-5 p-0">
      {posts.map((p) => {
        const href = `/blogs/${encodeURIComponent(p.author.username)}/${encodeURIComponent(p.slug)}`;
        const a = p.author;
        const byline = (a.fullName || a.username).trim() || a.username;
        const dateLabel = formatMoreByDate(p.createdAt || p.updatedAt);
        return (
          <li key={p._id}>
            <Link
              href={`/u/${a.username}`}
              className="group/byline block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex items-center gap-2">
                <img
                  src={authorAvatarSrc(a)}
                  alt=""
                  className="size-6 shrink-0 rounded-full border border-border/60 bg-muted object-cover"
                  width={20}
                  height={20}
                />
                <span className="min-w-0 truncate font-sans text-[9px] font-semibold uppercase text-muted-foreground decoration-primary underline-offset-2 transition-colors group-hover/byline:underline">
                  {byline}
                </span>
              </div>
            </Link>
            <Link
              href={href}
              className="group/title mt-2 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="line-clamp-2 font-sans text-xs font-bold leading-snug tracking-tight text-foreground transition-colors group-hover/title:text-primary">
                {p.title}
              </span>
            </Link>
              {dateLabel ? (
                <p className="mt-1.5 font-sans text-xs font-normal text-muted-foreground">{dateLabel}</p>
              ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function BlogPostDetailSideRail({
  username,
  slug,
  author,
  postTitle,
  moreByAuthor,
  loading,
}: Readonly<{
  username: string;
  slug: string;
  author: PublicFeedPostAuthor;
  postTitle: string;
  moreByAuthor: PublicFeedPost[];
  loading?: boolean;
}>) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const postUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const o = window.location.origin;
    return `${o}/blogs/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
  }, [username, slug]);

  const shareText = useMemo(() => `${postTitle}\n${postUrl}`, [postTitle, postUrl]);

  const whatsappHref = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    [shareText],
  );

  const facebookHref = useMemo(
    () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`,
    [postUrl],
  );

  const linkedInHref = useMemo(
    () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`,
    [postUrl],
  );

  const copyLink = async () => {
    if (!postUrl) return;
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast.success('Link copied');
      globalThis.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const copyForInstagram = async () => {
    if (!postUrl) return;
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('Copied — paste link in Instagram');
    } catch {
      toast.error('Could not copy');
    }
  };

  const tryNativeShare = async () => {
    if (!postUrl || !navigator.share) {
      await copyLink();
      return;
    }
    setSharing(true);
    try {
      await navigator.share({
        title: postTitle,
        text: postTitle,
        url: postUrl,
      });
    } catch {
      /* user dismissed */
    } finally {
      setSharing(false);
    }
  };

  const shareBusy = sharing;

  return (
    <div className="flex flex-col gap-4">
      <section className={RAIL_CARD} aria-labelledby="blog-rail-author-more">
        <h2
          id="blog-rail-author-more"
          className="mb-3 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground"
        >
          <UserPen className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
          More by AUTHOR
        </h2>
        <PostMiniList posts={moreByAuthor} loading={loading} emptyLabel="No other posts from this author." />
      </section>

      <section className={RAIL_CARD} aria-labelledby="blog-rail-share">
        <h2
          id="blog-rail-share"
          className="mb-3 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground"
        >
          <Share2 className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
          Share this post
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <a
            href={postUrl ? whatsappHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(SOCIAL_ICON_BTN, !postUrl && 'pointer-events-none opacity-50')}
            aria-label="Share on WhatsApp"
          >
            <WhatsAppIcon className="size-5 text-[#25D366]" />
          </a>
          <a
            href={postUrl ? facebookHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(SOCIAL_ICON_BTN, !postUrl && 'pointer-events-none opacity-50')}
            aria-label="Share on Facebook"
          >
            <FacebookIcon className="size-5 text-[#1877F2]" />
          </a>
          <a
            href={postUrl ? linkedInHref : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(SOCIAL_ICON_BTN, !postUrl && 'pointer-events-none opacity-50')}
            aria-label="Share on LinkedIn"
          >
            <LinkedinIcon className="size-5 text-[#0A66C2]" />
          </a>
          <button
            type="button"
            className={SOCIAL_ICON_BTN}
            disabled={!postUrl}
            aria-label="Copy link for Instagram"
            onClick={() => void copyForInstagram()}
          >
            <InstagramIcon className="size-5 text-[#E4405F]" />
          </button>
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
            <button
              type="button"
              className={SOCIAL_ICON_BTN}
              disabled={!postUrl || shareBusy}
              aria-label="Share with device"
              onClick={() => void tryNativeShare()}
            >
              <Share2 className="size-5 shrink-0 text-primary" strokeWidth={2.5} />
            </button>
          ) : null}
        </div>
        <BlockShadowButton
          type="button"
          variant="primary"
          size="sm"
          shadow="sm"
          fullWidth
          className="w-full font-mono text-[9px] font-black tracking-[0.12em]"
          disabled={!postUrl || shareBusy}
          onClick={() => void copyLink()}
        >
          {copied ? (
            <>
              <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
              Copy link
            </>
          )}
        </BlockShadowButton>
      </section>

      <section className={AUTHOR_CARD} aria-labelledby="blog-rail-author-card">
        <h2
          id="blog-rail-author-card"
          className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground"
        >
          Author
        </h2>
        <BlogPostAuthor author={author} variant="sideRail" />
      </section>
    </div>
  );
}
