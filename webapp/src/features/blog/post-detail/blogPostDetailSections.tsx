'use client';

/**
 * Blog post detail UI — co-located with the post route (P0 consolidation).
 * Previously: BlogCodeBlockDisplay, BlogCommentsSection, BlogImagePreviewDialog,
 * BlogPostCommentsDock, BlogPostDetailSideRail, BlogPostSidebarStats,
 * BlogPostTableOfContents, MermaidBlockDisplay.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  Eye,
  Heart,
  Image as ImageIcon,
  ListTree,
  MessageSquare,
  MessageSquareReply,
  Newspaper,
  Pencil,
  Repeat2,
  Share2,
  Trash2,
  UserPen,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { blogApi } from '@/api/blog';
import { BlogPostAuthor } from '@/features/blog';
import { BlockShadowButton } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/dialog';
import { FacebookIcon, InstagramIcon, LinkedinIcon } from '@/components/icons/SocialProviderIcons';
import { LinkPreviewCardContent } from '@/components/ui/popover';
import { RichParagraphEditor } from '@/components/ui/editor';
import { RetroSortDropdown } from '@/components/ui/retro';
import { BookmarkLottie, SparkLottie } from '@/components/ui/lottie';
import { highlightCodeToHtml } from '@/lib/blog/codeHighlight';
import type { BlogHeadingTocItem } from '@/lib/extractBlogHeadingToc';
import { formatShortRelativeTime } from '@/lib/format/formatShortRelativeTime';
import { SHELL_RAIL_FROST_CLASS, SHELL_RAIL_FROST_STYLE } from '@/lib/shell/shellContentRail';
import { cn } from '@/lib/core/utils';
import { useAuthDialogStore, type AuthDialogView } from '@/store/authDialog';
import { triggerRespectLightning } from '@/store/engagementEffects';
import { useAuthStore } from '@/store/auth';
import type { ParagraphPayload, PublicBlogComment, PublicFeedPost, PublicFeedPostAuthor } from '@/types/blog';
import { coerceParagraphDoc } from '@/types/blog';
import 'highlight.js/styles/github-dark.css';

const RAIL_CARD = 'border-2 border-border bg-card p-4 shadow';

// ─── BlogImagePreviewDialog.tsx ───

export type BlogImagePreviewOpen = (url: string, alt: string) => void;

const BlogImagePreviewContext = createContext<BlogImagePreviewOpen | null>(null);

export function useBlogImagePreview(): BlogImagePreviewOpen | null {
  return useContext(BlogImagePreviewContext);
}

type AspectKind = 'unknown' | 'landscape' | 'square' | 'portrait';

function aspectFromNaturalSize(w: number, h: number): AspectKind {
  if (w <= 0 || h <= 0) return 'unknown';
  const r = w / h;
  if (r > 1.2) return 'landscape';
  if (r < 0.85) return 'portrait';
  return 'square';
}

function BlogImagePreviewModal({
  open,
  onClose,
  url,
  alt,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  url: string;
  alt: string;
}>) {
  const [aspect, setAspect] = useState<AspectKind>('unknown');

  useEffect(() => {
    if (!open) setAspect('unknown');
  }, [open]);

  useEffect(() => {
    setAspect('unknown');
  }, [url]);

  const onImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setAspect(aspectFromNaturalSize(img.naturalWidth, img.naturalHeight));
  }, []);

  const panelClassName = cn(
    'flex max-h-[92vh] w-max flex-col overflow-hidden border-2 border-border bg-card shadow-none',
    aspect === 'landscape' && 'max-w-[min(96vw,72rem)]',
    aspect === 'square' && 'max-w-[min(96vw,42rem)]',
    aspect === 'portrait' && 'max-w-[min(96vw,28rem)]',
    aspect === 'unknown' && 'max-w-[min(96vw,80rem)]',
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="blog-image-preview-title"
      title="Image preview"
      titleIcon={<ImageIcon className="size-5 shrink-0" strokeWidth={2.25} aria-hidden />}
      description={
        alt ? (
          <span className="line-clamp-2 break-words" title={alt}>
            {alt}
          </span>
        ) : undefined
      }
      panelClassName={panelClassName}
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden bg-background p-0"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative mx-auto flex w-full min-h-0 flex-1 items-center justify-center">
          <img
            key={url}
            src={url}
            alt={alt || 'Preview'}
            onLoad={onImgLoad}
            className="block max-h-[min(78vh,760px)] w-auto max-w-full object-contain"
          />
        </div>
      </div>
    </Dialog>
  );
}

export function BlogImagePreviewProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [preview, setPreview] = useState<{ url: string; alt: string } | null>(null);
  const open = useCallback((imageUrl: string, imageAlt: string) => {
    setPreview({ url: imageUrl, alt: imageAlt || 'Image' });
  }, []);
  const close = useCallback(() => setPreview(null), []);
  const value = useMemo(() => open, [open]);

  return (
    <BlogImagePreviewContext.Provider value={value}>
      {children}
      <BlogImagePreviewModal
        open={preview != null}
        onClose={close}
        url={preview?.url ?? ''}
        alt={preview?.alt ?? ''}
      />
    </BlogImagePreviewContext.Provider>
  );
}


// ─── BlogPostSidebarStats.tsx ───

function formatStat(n: number): string {
  if (n > 99) return '99+';
  return String(Math.max(0, n));
}

function StatRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  value: string;
  valueClassName?: string;
}>) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          'shrink-0 font-mono text-xs font-black tabular-nums text-foreground',
          valueClassName,
        )}
      >
        {value}
      </span>
    </li>
  );
}

/**
 * Compact engagement counts for the blog post left rail (above the Index / TOC card).
 */
export function BlogPostSidebarStats({
  respectCount,
  repostCount,
  bookmarkCount,
  viewCount,
  commentTotal,
  commentLoading,
}: Readonly<{
  respectCount: number;
  repostCount: number;
  bookmarkCount: number;
  viewCount: number;
  commentTotal: number;
  commentLoading: boolean;
}>) {
  return (
    <section className={RAIL_CARD} aria-label="Post engagement">
      <h2 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        <Activity className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
        Stats
      </h2>
      <ul className="m-0 list-none space-y-2 p-0">
        <StatRow icon={Zap} label="Respect" value={formatStat(respectCount)} />
        <StatRow icon={Repeat2} label="Repost" value={formatStat(repostCount)} />
        <StatRow icon={Bookmark} label="Saved" value={formatStat(bookmarkCount)} />
        <StatRow icon={Eye} label="Views" value={formatStat(viewCount)} />
        <StatRow
          icon={MessageSquare}
          label="Comments"
          value={commentLoading ? '…' : formatStat(commentTotal)}
          valueClassName={commentLoading ? 'text-muted-foreground' : undefined}
        />
      </ul>
    </section>
  );
}


// ─── BlogPostTableOfContents.tsx ───

export function BlogPostTableOfContents({
  items,
  className,
}: Readonly<{
  items: BlogHeadingTocItem[];
  className?: string;
}>) {
  if (items.length === 0) return null;

  const scrollTo = (anchorId: string) => {
    const el = document.getElementById(anchorId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      className={cn('flex h-full min-h-0 flex-col space-y-3', className)}
      aria-label="On this page"
    >
      <div className={cn(RAIL_CARD, 'flex min-h-0 flex-1 flex-col overflow-hidden')}>
        <div className="mb-3 flex shrink-0 items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <ListTree className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
          Index
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 ss-scrollbar-hide">
          <ol className="m-0 list-none space-y-1.5 p-0">
            {items.map((item) => (
              <li key={item.anchorId}>
                <button
                  type="button"
                  onClick={() => scrollTo(item.anchorId)}
                  className={cn(
                    'w-full text-left font-sans text-xs font-semibold leading-snug text-foreground transition-colors',
                    'hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                    item.level === 3 ? 'pl-3 text-[11px] text-muted-foreground hover:text-primary' : '',
                  )}
                >
                  {item.text}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </nav>
  );
}


// ─── BlogCodeBlockDisplay.tsx ───

import 'highlight.js/styles/github-dark.css';

export function BlogCodeBlockDisplay({
  code,
  languageHint,
  className,
}: Readonly<{
  code: string;
  languageHint?: string | null;
  className?: string;
}>) {
  const { language, html } = useMemo(
    () => highlightCodeToHtml(code, languageHint),
    [code, languageHint],
  );
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div
      className={cn(
        'mx-auto my-5 w-full max-w-4xl overflow-hidden border-2 border-border',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b-2 border-border bg-zinc-900 px-3 py-2 sm:px-4">
        <span className="min-w-0 truncate font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 sm:text-xs">
          {language}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex shrink-0 items-center gap-1.5 border-2 border-zinc-600 bg-zinc-800 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-zinc-100 transition-colors hover:border-primary hover:bg-zinc-700 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words bg-zinc-950 p-3 text-[13px] leading-relaxed sm:p-5">
        <code
          className="hljs !bg-transparent whitespace-pre-wrap font-mono text-[13px]"
          // highlight.js output is escaped; safe for innerHTML
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}


// ─── MermaidBlockDisplay.tsx ───

export function MermaidBlockDisplay({
  source,
  className,
}: Readonly<{
  source: string;
  className?: string;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const toastedForSourceRef = useRef<string | null>(null);
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const trimmed = source.trim();
    if (!trimmed) {
      el.innerHTML = '';
      setErr(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        const id = `mermaid-${uid}-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, trimmed);
        if (cancelled) return;
        el.innerHTML = svg;
        setErr(null);
      } catch (e) {
        if (cancelled) return;
        const raw = e instanceof Error ? e.message : 'Invalid diagram';
        const detail =
          raw.length > 160
            ? `${raw.slice(0, 160)}…`
            : `${raw} — Quote labels that contain spaces in the editor.`;
        setErr(detail);
        el.innerHTML = '';
        if (toastedForSourceRef.current !== trimmed) {
          toastedForSourceRef.current = trimmed;
          toast.error('Could not render a Mermaid diagram on this page.', { description: detail });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, uid]);

  if (!source.trim()) return null;

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      {err ? (
        <div className="space-y-2 py-2">
          <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Unable to render Mermaid
          </p>
          <details className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            <summary className="cursor-pointer select-none text-foreground/90">Details</summary>
            <p className="mt-2 text-destructive/90">{err}</p>
          </details>
        </div>
      ) : (
        <div ref={ref} className="mermaid-render flex justify-center py-1 [&_svg]:max-h-[min(70vh,480px)]" />
      )}
    </div>
  );
}


// ─── BlogPostDetailSideRail.tsx ───

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
              <div className="size-8 shrink-0 bg-muted" />
              <div className="h-3.5 flex-1 max-w-[8rem] bg-muted" />
            </div>
            <div className="h-3.5 w-full bg-muted/90" />
            <div className="h-3.5 w-4/5 bg-muted/80" />
            <div className="h-3 w-16 bg-muted/70" />
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
          className="flex size-11 shrink-0 items-center justify-center bg-primary/15 text-primary dark:bg-primary/20"
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
                  className="size-6 shrink-0 border border-border/60 bg-muted object-cover"
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


// ─── BlogPostCommentsDock.tsx ───

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
        'absolute -right-2.5 -top-2 z-10 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center  border-2 border-border px-0.5',
        'bg-primary font-mono text-[8px] font-black tabular-nums leading-none text-primary-foreground shadow',
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
      className="absolute -right-1 -top-1 z-10 size-2.5 border-2 border-card bg-primary shadow"
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
          ? 'border-primary bg-primary text-primary-foreground shadow'
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
  onToggle: (source: HTMLButtonElement) => void;
}>) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => onToggle(e.currentTarget)}
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
            className="h-5 w-5 shrink-0 object-contain"
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

  const toggleRespect = useCallback(async (source?: HTMLButtonElement) => {
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
      if (r.respecting && wantOn && source) {
        triggerRespectLightning(source);
      }
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
            onToggle={(source) => void toggleRespect(source)}
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


// ─── BlogCommentsSection.tsx ───

type ThreadSort = 'oldest' | 'newest';

const COMMENT_SORT_OPTIONS = [
  { value: 'oldest' as const, label: 'Oldest first', shortLabel: 'Oldest' },
  { value: 'newest' as const, label: 'Newest first', shortLabel: 'Newest' },
] as const;

const COMMENT_LIKE_RAYS = 10;

function CommentLikeButton({
  comment: c,
  liked,
  likeCount,
  token,
  onToggleLike,
  openAuth,
}: Readonly<{
  comment: PublicBlogComment;
  liked: boolean;
  likeCount: number;
  token: string | null;
  onToggleLike: (comment: PublicBlogComment) => void | Promise<void>;
  openAuth: (view?: AuthDialogView) => void;
}>) {
  const [rayBurstSeq, setRayBurstSeq] = useState(0);

  return (
    <button
      type="button"
      onClick={() => {
        setRayBurstSeq((n) => n + 1);
        if (!token) {
          openAuth('login');
          return;
        }
        void onToggleLike(c);
      }}
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase',
        liked ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
      aria-pressed={liked}
    >
      <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
        {rayBurstSeq > 0 ? (
          <span
            key={rayBurstSeq}
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
          >
            {Array.from({ length: COMMENT_LIKE_RAYS }, (_, i) => (
              <span
                key={i}
                className="ss-comment-like-ray bg-primary"
                style={
                  {
                    '--ray-deg': `${i * (360 / COMMENT_LIKE_RAYS)}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </span>
        ) : null}
        <Heart
          className={cn(
            'relative z-[1] h-3.5 w-3.5 transition-[transform,color,fill] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            liked ? 'scale-[1.12] fill-current' : 'fill-none',
          )}
          strokeWidth={2.5}
        />
      </span>
      Like{likeCount > 0 ? ` · ${likeCount}` : ''}
    </button>
  );
}

function orderThreadComments(flat: PublicBlogComment[], sort: ThreadSort): PublicBlogComment[] {
  const byParent = new Map<string | null, PublicBlogComment[]>();
  for (const c of flat) {
    const pk: string | null = c.parentId;
    if (!byParent.has(pk)) byParent.set(pk, []);
    byParent.get(pk)!.push(c);
  }
  const cmp =
    sort === 'oldest'
      ? (a: PublicBlogComment, b: PublicBlogComment) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : (a: PublicBlogComment, b: PublicBlogComment) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  for (const arr of byParent.values()) {
    arr.sort(cmp);
  }
  const out: PublicBlogComment[] = [];
  function dfs(parentKey: string | null) {
    for (const item of byParent.get(parentKey) ?? []) {
      out.push(item);
      dfs(item._id);
    }
  }
  dfs(null);
  return out;
}

/** DFS `ordered` list → each root with its contiguous descendant slice (thread). */
function splitIntoThreads(ordered: PublicBlogComment[]): { root: PublicBlogComment; replies: PublicBlogComment[] }[] {
  const threads: { root: PublicBlogComment; replies: PublicBlogComment[] }[] = [];
  let i = 0;
  while (i < ordered.length) {
    const item = ordered[i];
    if (item.parentId != null) {
      i++;
      continue;
    }
    const root = item;
    const replies: PublicBlogComment[] = [];
    i++;
    while (i < ordered.length && ordered[i].parentId != null) {
      replies.push(ordered[i]);
      i++;
    }
    threads.push({ root, replies });
  }
  return threads;
}

function replyDepthFromRoot(
  rootId: string,
  comment: PublicBlogComment,
  byId: Map<string, PublicBlogComment>,
): number {
  let levelsBelowRoot = 0;
  let pid: string | null | undefined = comment.parentId;
  while (pid && pid !== rootId) {
    levelsBelowRoot += 1;
    pid = byId.get(pid)?.parentId ?? null;
  }
  return levelsBelowRoot + 1;
}

/** Thread root id that contains this comment id (root or any reply). */
function threadRootIdContainingComment(
  threadList: { root: PublicBlogComment; replies: PublicBlogComment[] }[],
  commentId: string,
): string | null {
  for (const t of threadList) {
    if (t.root._id === commentId) return t.root._id;
    if (t.replies.some((r) => r._id === commentId)) return t.root._id;
  }
  return null;
}

function paragraphPayloadFromCommentText(text: string): ParagraphPayload {
  const t = text.trim();
  if (t.startsWith('{') && t.includes('"type"')) {
    try {
      const parsed = JSON.parse(t) as { type?: string };
      if (parsed?.type === 'doc') return { doc: parsed, version: 'rich-text' };
    } catch {
      /* plain */
    }
  }
  return { text, version: 'plain' };
}

function collectDocText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { text?: string; content?: unknown[] };
  if (typeof n.text === 'string') return n.text;
  if (Array.isArray(n.content)) return n.content.map(collectDocText).join('');
  return '';
}

function emptyTipTapDoc() {
  return { type: 'doc', content: [{ type: 'paragraph', content: [] }] };
}

function CommentReadBody({ text, compact }: Readonly<{ text: string; compact?: boolean }>) {
  const p = paragraphPayloadFromCommentText(text);
  const doc = p.doc ?? coerceParagraphDoc(p);
  return (
    <div className={cn('min-w-0', compact ? 'mt-1.5' : 'mt-2')}>
      <RichParagraphEditor
        initialDoc={doc}
        readOnly
        normalizeContent={false}
        className={cn(
          '!border-none !bg-transparent !p-0 !shadow-none text-sm leading-relaxed text-foreground/90 selection:bg-primary/30',
        )}
        readOnlyLinkPreview={(href) => <LinkPreviewCardContent domain={href} />}
      />
    </div>
  );
}

type CommentCardViewProps = Readonly<{
  c: PublicBlogComment;
  variant: 'root' | 'reply';
  compact: boolean;
  showTimelineDot: boolean;
  extraIndentPx: number;
  viewerId: string;
  token: string | null;
  editingId: string | null;
  editDoc: unknown | null;
  editSaving: boolean;
  startEdit: (c: PublicBlogComment) => void;
  cancelEdit: () => void;
  saveEdit: () => void | Promise<void>;
  setEditDoc: (doc: unknown) => void;
  onToggleLike: (c: PublicBlogComment) => void | Promise<void>;
  openAuth: (view?: AuthDialogView) => void;
  setReplyParentId: (id: string | null) => void;
  setDeleteTarget: (c: PublicBlogComment) => void;
  /** Root-only: inline toggle for expanding replies under this thread. */
  threadReplyCount?: number;
  threadRepliesExpanded?: boolean;
  onToggleThreadReplies?: () => void;
  /** Reply-only: parent comment author for “Reply to” badge. */
  replyParentAuthor?: { username: string; fullName?: string | null } | null;
  /** Jump to parent comment in-thread (expand thread if needed). */
  onNavigateToParentComment?: (parentCommentId: string) => void;
}>;

function CommentCardView({
  c,
  variant,
  compact,
  showTimelineDot,
  extraIndentPx,
  viewerId,
  token,
  editingId,
  editDoc,
  editSaving,
  startEdit,
  cancelEdit,
  saveEdit,
  setEditDoc,
  onToggleLike,
  openAuth,
  setReplyParentId,
  setDeleteTarget,
  threadReplyCount,
  threadRepliesExpanded,
  onToggleThreadReplies,
  replyParentAuthor,
  onNavigateToParentComment,
}: CommentCardViewProps) {
  const isOwner = Boolean(viewerId && c.authorUserId === viewerId);
  const liked = c.likedByViewer === true;
  const pad = compact ? 'p-3' : 'p-4';
  const avatarCls = compact ? 'h-8 w-8' : 'h-10 w-10';
  const metaPad = 'py-0.5';

  const inner = (
    <div className="min-w-0">
      <div className={cn('flex flex-wrap items-start justify-between gap-x-2 gap-y-1', compact && 'gap-x-2')}>
        <BlogPostAuthor author={c.author} className="flex min-w-0 max-w-full items-start gap-2">
          <Link href={`/u/${c.author.username}`} className="shrink-0">
            <img
              src={
                c.author.profileImg ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.author.username)}`
              }
              alt=""
              className={cn(avatarCls, 'border-2 border-border object-cover')}
            />
          </Link>
          <div className="min-w-0">
            <Link
              href={`/u/${c.author.username}`}
              className="font-mono text-[11px] font-black uppercase leading-tight text-foreground hover:text-primary sm:text-xs"
            >
              {c.author.fullName || c.author.username}
            </Link>
            <span className="ml-1.5 font-mono text-[9px] text-muted-foreground sm:text-[10px]">
              @{c.author.username}
            </span>
          </div>
        </BlogPostAuthor>
        {replyParentAuthor != null ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => {
                if (c.parentId && onNavigateToParentComment) {
                  onNavigateToParentComment(c.parentId);
                }
              }}
              className="max-w-[11rem] truncate border-2 border-primary/45 bg-primary/10 px-1.5 py-0.5 text-center font-mono text-[8px] font-black uppercase leading-tight tracking-wide text-primary hover:bg-primary/18 sm:max-w-[13rem]"
              title={`Go to comment — ${replyParentAuthor.fullName?.trim() || `@${replyParentAuthor.username}`}`}
            >
              Reply to @{replyParentAuthor.username}
            </button>
            <div className="flex flex-wrap items-center justify-end gap-1">
              <span
                className={cn(
                  'shrink-0 border-2 border-border bg-background px-1.5 font-mono text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:px-2 sm:text-[10px]',
                  metaPad,
                )}
                title={new Date(c.createdAt).toLocaleString()}
              >
                {formatShortRelativeTime(c.createdAt)}
              </span>
              {c.editedAt ? (
                <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-wide text-primary/90 sm:text-[9px]">
                  · edited
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <span
              className={cn(
                'shrink-0 border-2 border-border bg-background px-1.5 font-mono text-[9px] font-bold uppercase tracking-wide text-muted-foreground sm:px-2 sm:text-[10px]',
                metaPad,
              )}
              title={new Date(c.createdAt).toLocaleString()}
            >
              {formatShortRelativeTime(c.createdAt)}
            </span>
            {c.editedAt ? (
              <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-wide text-primary/90 sm:text-[9px]">
                · edited
              </span>
            ) : null}
          </>
        )}
      </div>

      {editingId === c._id && editDoc != null ? (
        <div className={cn('space-y-2', compact ? 'mt-1.5' : 'mt-2')}>
          <RichParagraphEditor
            key={`edit-${c._id}`}
            initialDoc={editDoc}
            onChange={setEditDoc}
            editorPlaceholder="Edit comment…"
            className={cn(
              'min-h-[4rem] border-2 border-border bg-card p-0 font-mono text-sm',
              'focus-within:border-primary',
              compact && 'min-h-[3.5rem] text-[13px]',
            )}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={editSaving}
              className="border-2 border-border bg-card px-2.5 py-1 font-mono text-[10px] font-bold uppercase shadow hover:bg-muted/60 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={
                editSaving ||
                collectDocText(editDoc).trim().length === 0 ||
                JSON.stringify(editDoc).length > 50_000
              }
              className="border-2 border-border bg-primary px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-primary-foreground shadow disabled:opacity-50 hover:brightness-110"
            >
              {editSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <CommentReadBody text={c.text} compact={compact} />
      )}

      {editingId !== c._id ? (
        <div className={cn('flex flex-wrap items-center justify-end gap-x-3 gap-y-1', compact ? 'mt-1.5' : 'mt-2')}>
          <button
            type="button"
            onClick={() => {
              if (!token) {
                openAuth('login');
                return;
              }
              setReplyParentId(c._id);
              document.getElementById('blog-comment-composer-anchor')?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            }}
            className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
          >
            <MessageSquareReply className="h-3.5 w-3.5" strokeWidth={2.5} />
            Reply
          </button>
          {variant === 'root' &&
          threadReplyCount != null &&
          threadReplyCount > 0 &&
          onToggleThreadReplies ? (
            <button
              type="button"
              aria-expanded={threadRepliesExpanded === true}
              onClick={() => {
                onToggleThreadReplies();
              }}
              className={cn(
                'inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground',
                threadRepliesExpanded && 'text-primary',
              )}
            >
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                  threadRepliesExpanded && 'rotate-180',
                )}
                strokeWidth={2.5}
                aria-hidden
              />
              {threadRepliesExpanded ? 'Hide' : 'View'} replies
              <span className="tabular-nums text-muted-foreground">({threadReplyCount})</span>
            </button>
          ) : null}
          <CommentLikeButton
            comment={c}
            liked={liked}
            likeCount={c.likeCount}
            token={token}
            onToggleLike={onToggleLike}
            openAuth={openAuth}
          />
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => startEdit(c)}
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(c)}
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-destructive hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                Delete
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (variant === 'reply') {
    return (
      <article
        id={`blog-comment-${c._id}`}
        className="flex scroll-mt-28 gap-2"
        style={{ marginLeft: extraIndentPx }}
      >
        {showTimelineDot ? (
          <div className="relative flex w-5 shrink-0 items-center justify-center self-stretch" aria-hidden>
            <span className="absolute top-1/2 left-1/2 z-[1] size-2.5 -translate-x-1/2 -translate-y-1/2 border-2 border-border bg-primary ring-2 ring-card" />
          </div>
        ) : (
          <div className="w-5 shrink-0" aria-hidden />
        )}
        <div
          className={cn(
            'min-w-0 flex-1 border-2 border-border bg-card',
            pad,
            'bg-muted/5',
          )}
        >
          {inner}
        </div>
      </article>
    );
  }

  return (
    <article id={`blog-comment-${c._id}`} className={cn('scroll-mt-28 border-2 border-border bg-card', pad)}>
      {inner}
    </article>
  );
}

export function BlogCommentsSection({
  username,
  slug,
  hideTitle = false,
  onCommentStatsChange,
}: Readonly<{
  username: string;
  slug: string;
  /** When true, show `Signal_Channel` heading with sort + count on the right (blog post page). */
  hideTitle?: boolean;
  /** Total + loading for bottom dock badge / chrome. */
  onCommentStatsChange?: (stats: { total: number; loading: boolean }) => void;
}>) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [comments, setComments] = useState<PublicBlogComment[]>([]);
  const [commentTotal, setCommentTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [draftDoc, setDraftDoc] = useState<unknown>(() => emptyTipTapDoc());
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDoc, setEditDoc] = useState<unknown | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [threadSort, setThreadSort] = useState<ThreadSort>('oldest');
  const [deleteTarget, setDeleteTarget] = useState<PublicBlogComment | null>(null);
  const [deleteWorking, setDeleteWorking] = useState(false);

  const viewerId = user?.id ?? user?._id ?? '';

  const ordered = useMemo(() => orderThreadComments(comments, threadSort), [comments, threadSort]);
  const commentById = useMemo(() => new Map(comments.map((x) => [x._id, x])), [comments]);
  const threads = useMemo(() => splitIntoThreads(ordered), [ordered]);
  const [expandedReplyRootId, setExpandedReplyRootId] = useState<string | null>(null);
  const freshEmptyDoc = useMemo(() => emptyTipTapDoc(), [formKey]);

  const viewerAvatar =
    user?.profileImg ||
    (user?.username
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`
      : null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { comments: list, total } = await blogApi.getComments(username, slug, 80, token);
      setComments(list);
      setCommentTotal(total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load comments', {
        id: 'syntax-blog-comments-load',
      });
    } finally {
      setLoading(false);
    }
  }, [username, slug, token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onCommentStatsChange?.({ total: commentTotal, loading });
  }, [commentTotal, loading, onCommentStatsChange]);

  const draftPlain = collectDocText(draftDoc).trim();
  const draftSerialized = JSON.stringify(draftDoc ?? emptyTipTapDoc());
  const canSubmitNew = draftPlain.length > 0 && draftSerialized.length <= 50_000;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canSubmitNew) return;
    setSubmitting(true);
    try {
      const { comment } = await blogApi.postComment(
        username,
        slug,
        draftSerialized,
        token,
        replyParentId ?? undefined,
      );
      setComments((prev) => orderThreadComments([...prev, comment], threadSort));
      setCommentTotal((t) => t + 1);
      setReplyParentId(null);
      setFormKey((k) => k + 1);
      setDraftDoc(emptyTipTapDoc());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post comment', {
        id: 'syntax-blog-comments-post',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const replyLabel = useMemo(() => {
    if (!replyParentId) return null;
    const target = comments.find((c) => c._id === replyParentId);
    if (!target) return null;
    return target.author.username;
  }, [replyParentId, comments]);

  const canPost = Boolean(isHydrated && token);

  const onToggleLike = async (c: PublicBlogComment) => {
    if (!token) {
      openAuth('login');
      return;
    }
    const was = c.likedByViewer === true;
    const prevCount = c.likeCount;
    setComments((list) =>
      list.map((x) =>
        x._id !== c._id
          ? x
          : {
              ...x,
              likedByViewer: !was,
              likeCount: Math.max(0, prevCount + (was ? -1 : 1)),
            },
      ),
    );
    try {
      const r = await blogApi.toggleCommentLike(username, slug, c._id, token);
      setComments((list) =>
        list.map((x) =>
          x._id !== c._id
            ? x
            : {
                ...x,
                likeCount: r.likeCount,
                likedByViewer: r.likedByViewer,
              },
        ),
      );
    } catch {
      setComments((list) =>
        list.map((x) => (x._id !== c._id ? x : { ...x, likedByViewer: was, likeCount: prevCount })),
      );
      toast.error('Could not update like', { id: 'syntax-blog-comments-like' });
    }
  };

  const startEdit = (c: PublicBlogComment) => {
    const p = paragraphPayloadFromCommentText(c.text);
    const doc = p.doc ?? coerceParagraphDoc(p);
    setEditingId(c._id);
    setEditDoc(doc);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDoc(null);
  };

  const toggleThreadReplies = useCallback((rootId: string) => {
    setExpandedReplyRootId((prev) => (prev === rootId ? null : rootId));
  }, []);

  const navigateToParentComment = useCallback(
    (parentCommentId: string) => {
      const threadRootId = threadRootIdContainingComment(threads, parentCommentId);
      if (!threadRootId) return;

      const parentIsThreadRoot = threads.some((t) => t.root._id === parentCommentId);
      const needsExpandReplies = !parentIsThreadRoot && expandedReplyRootId !== threadRootId;

      if (needsExpandReplies) {
        setExpandedReplyRootId(threadRootId);
      }

      const delay = needsExpandReplies ? 340 : 0;

      window.setTimeout(() => {
        const el = document.getElementById(`blog-comment-${parentCommentId}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
        window.setTimeout(() => {
          el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
        }, 1800);
      }, delay);
    },
    [threads, expandedReplyRootId],
  );

  const saveEdit = async () => {
    if (!token || !editingId || editDoc == null) return;
    const serialized = JSON.stringify(editDoc);
    if (collectDocText(editDoc).trim().length === 0 || serialized.length > 50_000) return;
    setEditSaving(true);
    try {
      const { comment } = await blogApi.patchComment(username, slug, editingId, serialized, token);
      setComments((prev) => prev.map((x) => (x._id === comment._id ? comment : x)));
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save comment', {
        id: 'syntax-blog-comments-patch',
      });
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDeleteComment = async () => {
    if (!deleteTarget || !token) return;
    setDeleteWorking(true);
    try {
      await blogApi.deleteComment(username, slug, deleteTarget._id, token);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete comment', {
        id: 'syntax-blog-comments-delete',
      });
    } finally {
      setDeleteWorking(false);
    }
  };

  const shellClass = cn(!hideTitle && 'mt-12 border-t-4 border-border pt-8');

  const sortControl = (
    <RetroSortDropdown<ThreadSort>
      value={threadSort}
      onChange={setThreadSort}
      options={COMMENT_SORT_OPTIONS}
      ariaLabelPrefix="Sort comments"
    />
  );

  const countBadge = (
    <span
      className={cn(
        'flex h-10 min-w-10 shrink-0 items-center justify-center  border-2 border-border bg-card px-2',
        'font-mono text-xs font-black tabular-nums text-foreground shadow',
      )}
      title={loading ? 'Loading count…' : `${commentTotal} comments`}
      aria-label={loading ? 'Comment count loading' : `${commentTotal} comments`}
    >
      {loading ? '…' : commentTotal > 99 ? '99+' : commentTotal}
    </span>
  );

  const composerCompactBottom = !loading && comments.length === 0;

  const composer = (
    <div
      id="blog-comment-composer-anchor"
      className={cn('scroll-mt-28', composerCompactBottom ? 'mb-3' : 'mb-8')}
    >
      {isHydrated && canPost ? (
        <form onSubmit={onSubmit} className="space-y-3">
          {replyParentId && replyLabel ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-dashed border-border bg-muted/30 px-3 py-2 font-mono text-[10px] text-muted-foreground">
              <span>
                Replying to <span className="font-bold text-foreground">@{replyLabel}</span>
              </span>
              <button
                type="button"
                onClick={() => setReplyParentId(null)}
                className="font-bold uppercase text-foreground underline-offset-2 hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : null}
          <div className="flex items-start gap-3">
            <div className="shrink-0 pt-1">
              {viewerAvatar ? (
                <img
                  src={viewerAvatar}
                  alt=""
                  className="h-10 w-10 border-2 border-border object-cover"
                />
              ) : (
                <div className="h-10 w-10 border-2 border-dashed border-border bg-muted/40" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <label htmlFor={`blog-comment-editor-${formKey}`} className="sr-only">
                Share your thoughts
              </label>
              <div
                className={cn(
                  'border-2 border-border bg-card p-3 font-mono text-sm shadow',
                  'focus-within:border-primary focus-within:shadow',
                )}
              >
                <RichParagraphEditor
                  key={formKey}
                  initialDoc={freshEmptyDoc}
                  onChange={setDraftDoc}
                  editorPlaceholder="Share your thoughts…"
                  className="min-h-[4.5rem] border-0 bg-transparent p-0 font-mono text-sm shadow-none focus-within:ring-0"
                />
              </div>
              {draftSerialized.length > 50_000 ? (
                <p className="font-mono text-[10px] text-destructive">Comment is too long.</p>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={submitting || !canSubmitNew}
                  className="border-2 border-border bg-primary px-5 py-2 font-mono text-xs font-black uppercase text-primary-foreground shadow hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : isHydrated ? (
        <button
          type="button"
          onClick={() => openAuth('login')}
          className="border-2 border-border bg-card px-4 py-2 font-mono text-xs font-bold uppercase shadow hover:bg-muted/60"
        >
          Sign in to comment
        </button>
      ) : null}
    </div>
  );

  const body = (
    <>
      {hideTitle ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h2
            id="blog-comments-heading"
            className="flex min-w-0 items-center gap-2 font-mono text-sm font-black uppercase tracking-wider text-foreground"
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
            <span>Signal_Channel</span>
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {sortControl}
            {countBadge}
          </div>
        </div>
      ) : (
        <>
          <h2
            id="blog-comments-heading"
            className="mb-4 flex items-center gap-2 font-mono text-sm font-black uppercase tracking-wider text-foreground"
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
            Comments
          </h2>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            {sortControl}
            {countBadge}
          </div>
        </>
      )}

      {composer}

      {loading && <p className="font-mono text-xs text-muted-foreground">Loading comments…</p>}

      {!loading && comments.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 py-2 text-center"
          role="status"
        >
          <div
            className="flex size-11 shrink-0 items-center justify-center bg-primary/15 text-primary dark:bg-primary/20"
            aria-hidden
          >
            <MessageSquare className="size-5" strokeWidth={2.25} />
          </div>
          <p className="m-0 max-w-sm font-mono text-xs leading-relaxed text-muted-foreground">
            No comments yet — start the thread.
          </p>
        </div>
      ) : null}

      {!loading && threads.length > 0 ? (
        <ul className="space-y-3">
          {threads.map(({ root, replies }) => {
            const open = expandedReplyRootId === root._id;
            const n = replies.length;
            return (
              <li key={root._id} className="space-y-2">
                <CommentCardView
                  c={root}
                  variant="root"
                  compact
                  showTimelineDot={false}
                  extraIndentPx={0}
                  viewerId={viewerId}
                  token={token}
                  editingId={editingId}
                  editDoc={editDoc}
                  editSaving={editSaving}
                  startEdit={startEdit}
                  cancelEdit={cancelEdit}
                  saveEdit={saveEdit}
                  setEditDoc={setEditDoc}
                  onToggleLike={onToggleLike}
                  openAuth={openAuth}
                  setReplyParentId={setReplyParentId}
                  setDeleteTarget={setDeleteTarget}
                  threadReplyCount={n}
                  threadRepliesExpanded={open}
                  onToggleThreadReplies={() => toggleThreadReplies(root._id)}
                />

                {n > 0 ? (
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        key={`thread-${root._id}-replies`}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <ul className="space-y-2 pt-1">
                          {replies.map((reply, idx) => {
                            const depth = replyDepthFromRoot(root._id, reply, commentById);
                            const indent = Math.min(Math.max(depth - 1, 0), 4) * 8;
                            const parentComment = reply.parentId ? commentById.get(reply.parentId) : undefined;
                            const replyParentAuthor = parentComment
                              ? {
                                  username: parentComment.author.username,
                                  fullName: parentComment.author.fullName,
                                }
                              : null;
                            return (
                              <motion.li
                                key={reply._id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.18, delay: idx * 0.035 }}
                              >
                                <CommentCardView
                                  c={reply}
                                  variant="reply"
                                  compact
                                  showTimelineDot
                                  extraIndentPx={indent}
                                  replyParentAuthor={replyParentAuthor}
                                  onNavigateToParentComment={navigateToParentComment}
                                  viewerId={viewerId}
                                  token={token}
                                  editingId={editingId}
                                  editDoc={editDoc}
                                  editSaving={editSaving}
                                  startEdit={startEdit}
                                  cancelEdit={cancelEdit}
                                  saveEdit={saveEdit}
                                  setEditDoc={setEditDoc}
                                  onToggleLike={onToggleLike}
                                  openAuth={openAuth}
                                  setReplyParentId={setReplyParentId}
                                  setDeleteTarget={setDeleteTarget}
                                />
                              </motion.li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleteWorking) setDeleteTarget(null);
        }}
        titleId="blog-comment-delete-dialog-title"
        title="Delete comment"
        message="This removes the comment and all replies under it. This cannot be undone."
        confirmLabel="Delete"
        closeOnConfirm={false}
        onConfirm={confirmDeleteComment}
        loading={deleteWorking}
      />
    </>
  );

  if (hideTitle) {
    return body;
  }

  return (
    <section className={shellClass} aria-label="Comments">
      {body}
    </section>
  );
}

