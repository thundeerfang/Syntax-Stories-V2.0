'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Hash, Calendar, ExternalLink, Terminal } from 'lucide-react';
import { blogApi } from '@/api/blog';
import { LinkPreviewCardContent } from '@/components/ui/LinkPreviewCardContent';
import { RichParagraphEditor } from '@/components/ui/RichParagraphEditor';
import { GithubIcon } from '@/components/icons/SocialProviderIcons';
import { cn } from '@/lib/utils';
import { summaryToPlainText } from '@/lib/summaryPlain';
import { coerceImageLayout } from '@/lib/blogImageLayout';
import type {
  Block,
  ImageBlockLayout,
  MermaidDiagramPayload,
  ParagraphPayload,
  PublicBlogPostDetail,
  TablePayload,
  VideoEmbedDisplaySize,
  VideoEmbedLayoutDirection,
  VideoEmbedPayload,
} from '@/types/blog';
import { coerceParagraphDoc } from '@/types/blog';
import { BlogPostAuthor } from '@/components/blog/BlogPostAuthor';
import { BlogCommentsSection } from '@/components/blog/BlogCommentsSection';
import { BlogCodeBlockDisplay } from '@/components/blog/BlogCodeBlockDisplay';
import { MermaidBlockDisplay } from '@/components/blog/MermaidBlockDisplay';
import { blockShadowButtonClassNames } from '@/components/ui/BlockShadowButton';
import { Dialog } from '@/components/ui/Dialog';
import { useAuthStore } from '@/store/auth';

type BlogImagePreviewOpen = (url: string, alt: string) => void;
const BlogImagePreviewContext = createContext<BlogImagePreviewOpen | null>(null);

function useBlogImagePreview(): BlogImagePreviewOpen | null {
  return useContext(BlogImagePreviewContext);
}

function BlogImagePreviewProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [preview, setPreview] = useState<{ url: string; alt: string } | null>(null);
  const open = useCallback((url: string, alt: string) => {
    setPreview({ url, alt: alt || 'Image' });
  }, []);
  const close = useCallback(() => setPreview(null), []);
  const value = useMemo(() => open, [open]);

  return (
    <BlogImagePreviewContext.Provider value={value}>
      {children}
      <Dialog
        open={preview != null}
        onClose={close}
        titleId="blog-image-preview-title"
        panelClassName="pointer-events-auto w-full max-w-5xl max-h-[92vh] overflow-hidden border-2 border-border bg-card shadow-[6px_6px_0px_0px_var(--border)]"
        contentClassName="relative p-4 sm:p-6"
      >
        <h2 id="blog-image-preview-title" className="sr-only">
          Image preview
        </h2>
        {preview ? (
          <img
            src={preview.url}
            alt={preview.alt}
            className="mx-auto max-h-[min(80vh,720px)] w-full max-w-full object-contain"
          />
        ) : null}
      </Dialog>
    </BlogImagePreviewContext.Provider>
  );
}

// --- HELPERS ---
function parseBlocks(content: string): Block[] {
  try {
    const p = JSON.parse(content) as unknown;
    return Array.isArray(p) ? (p as Block[]) : [];
  } catch {
    return [];
  }
}

function clampPublicVideoSize(
  count: number,
  size: VideoEmbedDisplaySize | undefined,
  layout: VideoEmbedLayoutDirection,
): VideoEmbedDisplaySize {
  if (layout === 'column') return size === 'sm' || size === 'md' || size === 'lg' ? size : 'md';
  if (count >= 3) return 'sm';
  if (count === 2) {
    if (size === 'lg') return 'md';
    const isValidSize = size === 'sm' || size === 'md' || size === 'lg';
    return isValidSize ? size : 'md';
  }
  return size === 'sm' || size === 'md' || size === 'lg' ? size : 'md';
}

function videoEmbedUrls(p: VideoEmbedPayload): string[] {
  const v = (p.videos ?? []).filter((s) => typeof s === 'string' && s.trim()).slice(0, 3);
  if (v.length) return v;
  const legacyUrl = (p as Record<string, unknown>).url;
  const u = typeof legacyUrl === 'string' ? legacyUrl.trim() : '';
  return u ? [u] : [];
}

/**
 * Published image frame:
 * - landscape: 16:9, **full width** of the post body (no inset “card” width)
 * - square: 1:1, centered, `max-w-xl`
 * - fullWidth: full width, tall strip
 */
function publicImageFrameClass(layout: ImageBlockLayout): string {
  const base =
    'relative overflow-hidden border-2 border-border bg-background shadow-[6px_6px_0_0_var(--border)]';
  switch (layout) {
    case 'square':
      return cn(base, 'mx-auto aspect-square w-full max-w-xl');
    case 'fullWidth':
      return cn(
        base,
        'w-full min-h-[20rem] max-h-[min(42rem,88vh)] sm:min-h-[22rem] lg:min-h-[26rem]',
      );
    case 'landscape':
      return cn(base, 'w-full aspect-video');
  }
}

function paragraphPreviewCard(href: string) {
  return <LinkPreviewCardContent domain={href} />;
}

/** Retro label overlay on images / Unsplash (matches editor chrome). */
const RETRO_MEDIA_BADGE =
  'inline-flex max-w-[min(92%,20rem)] items-center border-2 border-white/40 bg-black/80 px-2 py-1 font-mono text-[9px] font-bold uppercase leading-snug tracking-wide text-white shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]';

function isYoutubeEmbedUrl(src: string): boolean {
  return /youtube\.com\/embed|youtube-nocookie\.com\/embed/i.test(src);
}

/** Mirrors editor: sm/md fixed columns; `lg` matches blog image rail (`max-w-4xl`). */
function publicVideoItemClass(size: VideoEmbedDisplaySize, layout: VideoEmbedLayoutDirection): string {
  if (layout === 'column') {
    if (size === 'sm') return 'w-full max-w-[7.75rem] mx-auto shrink-0';
    if (size === 'md') return 'w-full max-w-[11.5rem] mx-auto shrink-0';
    return 'w-full max-w-4xl mx-auto shrink-0';
  }
  if (size === 'sm') return 'w-[min(100%,7.75rem)] sm:w-[7.75rem] shrink-0';
  if (size === 'md') return 'w-[min(100%,11.5rem)] sm:w-[11.5rem] shrink-0';
  return 'w-full max-w-4xl shrink-0';
}

/** YouTube: sm/md compact heights; `lg` uses full width + 16:9 aspect (tall like main images). */
function youtubeIframeHeightClass(size: VideoEmbedDisplaySize): string {
  if (size === 'sm') return 'h-[4.5rem] w-full min-h-0 border-0';
  if (size === 'md') return 'h-[6.75rem] w-full min-h-0 border-0';
  return 'aspect-video w-full min-h-[12rem] border-0 max-h-[min(80vh,36rem)]';
}

function getCodeText(payload?: Record<string, unknown>): string {
  if (typeof payload?.code === 'string') return payload.code;
  if (typeof payload?.text === 'string') return payload.text;
  return '';
}

function ParagraphBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const p = (payload ?? {}) as ParagraphPayload;
  const doc = p.doc ?? coerceParagraphDoc(p);
  return (
    <div className="relative mx-auto w-full max-w-4xl border-l-4 border-primary/30 pl-5 py-1.5">
      <RichParagraphEditor
        initialDoc={doc}
        legacyText={p.text}
        readOnly
        className="!bg-transparent !p-0 !shadow-none !border-none text-base"
        readOnlyLinkPreview={paragraphPreviewCard}
      />
    </div>
  );
}

function HeadingBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const text = (payload?.text as string) ?? '';
  const level = payload?.level === 3 ? 3 : 2;
  const Tag = level === 3 ? 'h3' : 'h2';
  return (
    <Tag className={cn(
      "mx-auto w-full max-w-4xl font-mono font-black uppercase tracking-tight text-foreground",
      level === 3
        ? "text-xl sm:text-2xl mt-6 mb-3"
        : "text-3xl sm:text-4xl mt-8 mb-4 border-b-[3px] border-muted-foreground/30 pb-2 dark:border-muted-foreground/25"
    )}>
      <span className="mr-2 text-primary">#</span>
      {text}
    </Tag>
  );
}

function PartitionBlock() {
  return (
    <div className="my-7 flex w-full items-center gap-3" role="separator" aria-hidden>
      <div className="h-[3px] flex-1 rounded-[1px] bg-muted-foreground/25 dark:bg-muted-foreground/20" />
      <div className="size-1.5 shrink-0 rotate-45 border-2 border-muted-foreground/35 bg-background shadow-[2px_2px_0_0_var(--border)]" />
      <div className="h-[3px] flex-1 rounded-[1px] bg-muted-foreground/25 dark:bg-muted-foreground/20" />
    </div>
  );
}

function ImageBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const openPreview = useBlogImagePreview();
  const url = typeof payload?.url === 'string' ? payload.url : '';
  if (!url) return null;
  const title = ((payload?.title || payload?.caption) as string)?.trim() ?? '';
  const layout = coerceImageLayout(payload?.layout);
  const frameClass = publicImageFrameClass(layout);
  const alt = title || 'Content image';
  return (
    <figure className="my-5">
      <div className={frameClass}>
        <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
        {openPreview ? (
          <button
            type="button"
            className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
            aria-label="Preview image"
            onClick={() => openPreview(url, alt)}
          />
        ) : null}
        {title ? (
          <div className="pointer-events-none absolute bottom-2 left-2 z-20">
            <span className={RETRO_MEDIA_BADGE}>{title}</span>
          </div>
        ) : null}
      </div>
    </figure>
  );
}

function UnsplashPublicImageBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const openPreview = useBlogImagePreview();
  const url = typeof payload?.url === 'string' ? payload.url : '';
  if (!url) return null;
  const caption = typeof payload?.caption === 'string' ? payload.caption.trim() : '';
  const photographer = typeof payload?.photographer === 'string' ? payload.photographer.trim() : '';
  const photoId = typeof payload?.unsplashPhotoId === 'string' ? payload.unsplashPhotoId.trim() : '';
  const layout = coerceImageLayout(payload?.layout);
  const frameClass = publicImageFrameClass(layout);
  let creditLine = '';
  if (photographer) {
    creditLine = /^Photo by/i.test(photographer)
      ? photographer
      : `Photo by ${photographer} on Unsplash`;
  }
  const unsplashPhotoHref = photoId
    ? `https://unsplash.com/photos/${encodeURIComponent(photoId)}`
    : 'https://unsplash.com';
  const alt = caption || creditLine || 'Photo';

  return (
    <figure className="my-5">
      <div className={frameClass}>
        <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
        {openPreview ? (
          <button
            type="button"
            className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
            aria-label="Preview image"
            onClick={() => openPreview(url, alt)}
          />
        ) : null}
        {caption ? (
          <div className="pointer-events-none absolute bottom-2 left-2 z-20">
            <span className={RETRO_MEDIA_BADGE}>{caption}</span>
          </div>
        ) : null}
        {creditLine ? (
          <div className="absolute bottom-2 right-2 z-30 max-w-[min(88%,16rem)]">
            <a
              href={unsplashPhotoHref}
              target="_blank"
              rel="noopener noreferrer"
              title="View on Unsplash"
              className={cn(RETRO_MEDIA_BADGE, 'pointer-events-auto hover:brightness-110')}
            >
              {creditLine}
            </a>
          </div>
        ) : null}
      </div>
    </figure>
  );
}

function VideoEmbedBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const p = (payload ?? {}) as VideoEmbedPayload;
  const urls = videoEmbedUrls(p);
  if (urls.length === 0) return null;
  const layout: VideoEmbedLayoutDirection = p.layout === 'column' ? 'column' : 'row';
  const rawSize = p.size === 'sm' || p.size === 'md' || p.size === 'lg' ? p.size : 'md';
  const size = clampPublicVideoSize(urls.length, rawSize, layout);

  return (
    <div
      className={cn(
        'my-5 flex w-full flex-wrap justify-center gap-4',
        layout === 'column' ? 'flex-col items-center' : 'flex-row',
      )}
    >
      {urls.map((src) => {
        const yt = isYoutubeEmbedUrl(src);
        const itemClass = publicVideoItemClass(size, layout);
        const iframeClass = yt
          ? youtubeIframeHeightClass(size)
          : cn('aspect-video w-full min-h-[10rem] border-0');
        const lgYoutube = yt && size === 'lg';
        return (
          <div key={src} className={cn('relative overflow-hidden', itemClass)}>
            {lgYoutube ? (
              <div className="relative aspect-video w-full min-h-[12rem] max-h-[min(80vh,36rem)]">
                <iframe
                  src={src}
                  title="Embedded video"
                  className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : (
              <iframe
                src={src}
                title="Embedded video"
                className={iframeClass}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CodeBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const code = getCodeText(payload);
  const languageHint =
    typeof payload?.language === 'string' && payload.language.trim()
      ? payload.language
      : null;
  if (!code) return null;
  return <BlogCodeBlockDisplay code={code} languageHint={languageHint} />;
}

function TableBlock({ payload }: Readonly<{ payload?: TablePayload }>) {
  const rows = payload?.rows ?? [];
  if (!rows.length) return null;
  const cap = (payload?.caption ?? '').trim();
  return (
    <figure className="my-6 w-full overflow-x-auto">
      {cap ? (
        <figcaption className="mb-2 max-w-4xl font-mono text-base font-black uppercase tracking-tight text-foreground">
          {cap}
        </figcaption>
      ) : null}
      <div className="mx-auto max-w-4xl overflow-x-auto border-2 border-border bg-card shadow-[6px_6px_0_0_var(--border)]">
        <table className="w-full min-w-[280px] border-collapse text-left text-sm">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={`tr-${ri}`} className={ri === 0 ? 'bg-muted/40' : ''}>
                {row.map((cell, ci) => (
                  <td
                    key={`td-${ri}-${ci}`}
                    className="border border-border px-3 py-2 align-top font-mono text-[13px] leading-snug text-foreground"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function MermaidBlock({ payload }: Readonly<{ payload?: MermaidDiagramPayload }>) {
  const src = typeof payload?.source === 'string' ? payload.source : '';
  if (!src.trim()) return null;
  return <MermaidBlockDisplay source={src} />;
}

function GithubRepoBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const owner = typeof payload?.owner === 'string' ? payload.owner : '';
  const repo = typeof payload?.repo === 'string' ? payload.repo : '';
  const name = typeof payload?.name === 'string' ? payload.name : repo;
  const description = typeof payload?.description === 'string' ? payload.description : '';
  const href = (payload?.url as string) || `https://github.com/${owner}/${repo}`;
  const avatarUrl = typeof payload?.avatarUrl === 'string' ? payload.avatarUrl.trim() : '';

  return (
    <div className="mx-auto my-5 flex w-full max-w-4xl flex-col gap-4 border-2 border-border bg-card p-4 shadow-[6px_6px_0_0_var(--border)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border-2 border-border object-cover shadow-[4px_4px_0_0_var(--border)]"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-border bg-muted shadow-[4px_4px_0_0_var(--border)]">
            <GithubIcon className="h-7 w-7" />
          </div>
        )}
        <div className="min-w-0">
          <h4 className="font-mono text-base font-black uppercase text-foreground">
            {owner}/{name}
          </h4>
          {description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Repository on GitHub</p>
          )}
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={blockShadowButtonClassNames({
          variant: 'primary',
          size: 'sm',
          className: 'shrink-0 font-mono normal-case tracking-normal',
        })}
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Open on GitHub
      </a>
    </div>
  );
}

// --- COMPONENTS ---

function PublicBlogBlock({ block }: Readonly<{ block: Block }>) {
  const payload = block.payload as Record<string, unknown> | undefined;

  switch (block.type) {
    case 'paragraph':
      return <ParagraphBlock payload={payload} />;
    case 'heading':
      return <HeadingBlock payload={payload} />;
    case 'partition':
      return <PartitionBlock />;
    case 'image':
      return <ImageBlock payload={payload} />;
    case 'unsplashImage':
      return <UnsplashPublicImageBlock payload={payload} />;
    case 'videoEmbed':
      return <VideoEmbedBlock payload={payload} />;
    case 'code':
      return <CodeBlock payload={payload} />;
    case 'githubRepo':
      return <GithubRepoBlock payload={payload} />;
    case 'table':
      return <TableBlock payload={payload as unknown as TablePayload} />;
    case 'mermaidDiagram':
      return <MermaidBlock payload={payload as unknown as MermaidDiagramPayload} />;
    default:
      return null;
  }
}

function BlogPublicBody({ content }: Readonly<{ content: string }>) {
  const blocks = parseBlocks(content);
  if (blocks.length === 0) return null;
  return (
    <div className="public-blog-body w-full space-y-4">
      {blocks.map((block) => (
        <PublicBlogBlock key={block.id} block={block} />
      ))}
    </div>
  );
}

function DiscoverSidebar() {
  return (
    <aside
      className="rounded-none border-2 border-dashed border-border/60 bg-card p-4 text-center shadow-[4px_4px_0_0_var(--border)] lg:sticky lg:top-6 lg:max-h-[calc(100vh-2.5rem)] lg:self-start lg:overflow-y-auto"
      aria-label="Aside"
    >
      <p className="font-mono text-[10px] font-bold uppercase leading-relaxed text-muted-foreground">
        Related content will appear here.
      </p>
    </aside>
  );
}

// --- MAIN PAGE ---

export default function PublicBlogPostPage() {
  const params = useParams();
  const username = typeof params.username === 'string' ? params.username : '';
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const viewerUsername = useAuthStore((s) => s.user?.username ?? null);
  const [post, setPost] = useState<PublicBlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!username || !slug) return;
      try {
        const { post: p } = await blogApi.getPublishedPost(username, slug);
        setPost(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Post not found');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [username, slug]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="border-4 border-border bg-card p-12 shadow-[8px_8px_0px_0px_var(--border)]">
        <p className="font-mono text-lg font-black tracking-widest uppercase animate-pulse">Loading_Document...</p>
      </div>
    </div>
  );

  if (error || !post) return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="max-w-md border-4 border-destructive bg-destructive/5 p-8 shadow-[8px_8px_0px_0px_var(--destructive)]">
        <h1 className="font-mono text-xl font-black uppercase text-destructive mb-2">Error_Occurred</h1>
        <p className="font-mono text-sm">{error ?? 'Post not found in our database.'}</p>
        <Link href="/" className="mt-6 inline-block border-2 border-destructive px-4 py-2 font-mono text-xs font-bold hover:bg-destructive hover:text-white transition-colors">
          RETURN_TO_BASE
        </Link>
      </div>
    </div>
  );

  const plainSummary = summaryToPlainText(post.summary);
  const summaryLooksHtml = /<[a-z][\s\S]*>/i.test(post.summary ?? '');
  const dateRaw = post.updatedAt?.trim() || post.createdAt?.trim() || '';
  const publishedDate = dateRaw ? new Date(dateRaw) : null;
  const published =
    publishedDate && !Number.isNaN(publishedDate.getTime())
      ? publishedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '—';

  const showEditedForAuthorOnly = Boolean(
    viewerUsername &&
      post.author?.username &&
      viewerUsername === post.author.username &&
      post.lastEditedAt?.trim(),
  );

  return (
    <BlogImagePreviewProvider>
    <div className="min-h-screen py-4 px-2 font-sans text-foreground selection:bg-primary selection:text-primary-foreground md:px-4 md:py-6">
      <div className="mx-auto max-w-[1600px] border-x-2 border-dashed border-border/30 px-2 md:px-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-4">
          <main className="min-w-0 space-y-6 lg:col-span-10 lg:pr-0">
            <article className="border-4 border-border bg-card shadow-[10px_10px_0px_0px_var(--border)]">
              
              {/* Post Header — same bg as article body, compact vertical rhythm */}
              <header className="border-b-4 border-border bg-card px-4 py-4 md:px-6 md:py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <time
                    dateTime={dateRaw || undefined}
                    className="flex items-center gap-1.5 border-2 border-border bg-background px-3 py-1.5 font-mono text-xs font-bold uppercase text-foreground"
                  >
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                    {published}
                  </time>
                  {showEditedForAuthorOnly ? (
                    <span className="inline-flex items-center gap-1.5 border-2 border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-amber-950 dark:text-amber-100">
                      Edited{' '}
                      {new Date(post.lastEditedAt!).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {post.lastEditedBy?.fullName || post.lastEditedBy?.username
                        ? ` · ${post.lastEditedBy.fullName ?? post.lastEditedBy.username}`
                        : ''}
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-4 font-mono text-2xl font-black uppercase leading-tight tracking-tighter text-foreground sm:text-4xl md:text-5xl">
                  {post.title}
                </h1>

                <div className="mt-4">
                  <BlogPostAuthor author={post.author} />
                </div>
              </header>

              {plainSummary.trim() ? (
                <div className="relative border-t-4 border-border bg-muted/5 px-4 py-8 pt-10 md:px-6">
                  <div className="absolute left-0 top-0 flex items-stretch">
                    <div className="flex items-center gap-2 bg-primary px-3 py-1.5">
                      <Terminal className="size-3 text-primary-foreground" strokeWidth={2.5} aria-hidden />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary-foreground">
                        Summary_Report
                      </span>
                    </div>
                    <div className="w-4 bg-primary" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 100%)' }} />
                  </div>
                  <div
                    className="max-w-none text-sm font-medium leading-relaxed text-foreground/80
                      [&_a]:text-primary [&_a]:underline [&_br]:block [&_em]:italic [&_em]:text-foreground
                      [&_strong]:font-black [&_strong]:text-primary [&_u]:decoration-primary/50"
                  >
                    {summaryLooksHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: post.summary }} />
                    ) : (
                      <div className="whitespace-pre-wrap">{plainSummary}</div>
                    )}
                  </div>
                  <div className="absolute bottom-1 right-4 size-3 border-r-2 border-b-2 border-border/50" aria-hidden />
                </div>
              ) : null}

              {/* Post Body */}
              <div className="space-y-6 px-4 py-5 md:px-6 md:py-6">
                <div className="prose-retro">
                  <BlogPublicBody content={post.content} />
                </div>

                <BlogCommentsSection username={username} slug={slug} />
              </div>

              {/* Footer */}
              <footer className="border-t-4 border-border bg-muted/50 p-6 flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase text-muted-foreground">
                  <Hash className="h-4 w-4" /> End_of_Transmission
                </div>
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="border-2 border-border bg-card px-4 py-2 font-mono text-xs font-bold uppercase shadow-[3px_3px_0px_0px_var(--border)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                  Return_To_Top ↑
                </button>
              </footer>
            </article>
          </main>

          <div className="lg:col-span-2 lg:min-w-0">
            <DiscoverSidebar />
          </div>

        </div>

      
      </div>
    </div>
    </BlogImagePreviewProvider>
  );
}