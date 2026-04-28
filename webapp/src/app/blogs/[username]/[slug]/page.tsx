'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUp,
  Calendar,
  ChevronRight,
  Clock,
  ExternalLink,
  Hash,
  Loader2,
  Terminal,
} from 'lucide-react';
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
import { SHELL_CONTENT_MEASURE_CLASS, SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';

type BlogImagePreviewOpen = (url: string, alt: string) => void;
const BlogImagePreviewContext = createContext<BlogImagePreviewOpen | null>(null);

function useBlogImagePreview(): BlogImagePreviewOpen | null {
  return useContext(BlogImagePreviewContext);
}

const CARD_SHADOW = 'shadow-[8px_8px_0px_0px_var(--border)]';

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
        panelClassName={cn(
          'pointer-events-auto w-full max-w-6xl max-h-[92vh] overflow-hidden border-4 border-border bg-card',
          'shadow-[12px_12px_0_0_var(--border)]',
        )}
        contentClassName="relative bg-background p-2 sm:p-3"
      >
        <h2 id="blog-image-preview-title" className="sr-only">
          Image preview
        </h2>
        {preview ? (
          <div>
            <img
              src={preview.url}
              alt={preview.alt}
              className="mx-auto max-h-[85vh] w-full object-contain"
            />
            <div className="mt-2 text-center font-mono text-[10px] font-bold uppercase text-muted-foreground">
              [ ESC_TO_CLOSE ] • {preview.alt}
            </div>
          </div>
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

function paragraphPreviewCard(href: string) {
  return <LinkPreviewCardContent domain={href} />;
}

const RETRO_MEDIA_BADGE =
  'inline-flex max-w-[min(92%,20rem)] items-center border-2 border-white/40 bg-black/80 px-2.5 py-1 font-mono text-[9px] font-bold uppercase leading-snug tracking-wider text-white shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]';

function ContentEmbedFrame({
  module,
  subtitle,
  children,
  className,
}: Readonly<{
  module: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        'overflow-hidden border-2 border-border bg-card shadow-[6px_6px_0_0_var(--border)] transition-shadow duration-200 hover:shadow-[8px_8px_0_0_var(--border)]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b-2 border-border bg-muted/40 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-foreground">
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
          <span className="shrink-0 text-primary" aria-hidden>
            ▣
          </span>
          <span className="shrink-0">{module}</span>
          {subtitle ? (
            <span className="min-w-0 truncate text-[8px] font-bold normal-case tracking-normal text-muted-foreground sm:text-[9px]">
              <span className="mx-1 text-border" aria-hidden>
                ·
              </span>
              {subtitle}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 rounded border border-border bg-background px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
          EMBED
        </span>
      </div>
      <div className="bg-background">{children}</div>
    </div>
  );
}

function embeddedFigureInnerClass(layout: ImageBlockLayout): string {
  switch (layout) {
    case 'square':
      return 'mx-auto aspect-square w-full max-w-xl';
    case 'fullWidth':
      return 'w-full min-h-[20rem] max-h-[min(42rem,88vh)] sm:min-h-[22rem] lg:min-h-[26rem]';
    case 'landscape':
    default:
      return 'aspect-video w-full';
  }
}

function mermaidEmbedSubtitle(source: string): string {
  const line = source.trim().split(/\n/)[0] ?? '';
  const t = line.length > 72 ? `${line.slice(0, 69)}…` : line;
  return t.trim() || 'Mermaid diagram';
}

function isYoutubeEmbedUrl(src: string): boolean {
  return /youtube\.com\/embed|youtube-nocookie\.com\/embed/i.test(src);
}

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
    <div className={cn('group relative mx-auto mb-8', SHELL_CONTENT_MEASURE_CLASS)}>
      <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/10 transition-colors group-hover:bg-primary/30" />
      <RichParagraphEditor
        initialDoc={doc}
        legacyText={p.text}
        readOnly
        className="!border-none !bg-transparent !p-0 !shadow-none text-[17px] leading-[1.7] text-foreground/90 selection:bg-primary/30"
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
    <div
      className={cn(
        'group mx-auto mb-6 w-full',
        SHELL_CONTENT_MEASURE_CLASS,
        level === 3 ? 'mt-10' : 'mt-16',
      )}
    >
      <Tag
        className={cn(
          'flex items-center gap-3 font-mono font-black tracking-tight text-foreground',
          level === 3
            ? 'border-l-4 border-primary/50 pl-4 text-lg normal-case sm:text-xl'
            : 'text-3xl uppercase sm:text-4xl',
        )}
      >
        {level === 3 ? (
          <span className="shrink-0 font-mono text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">
            Field
          </span>
        ) : (
          <span className="shrink-0 animate-pulse text-primary" aria-hidden>
            {'///'}
          </span>
        )}
        <span className="relative min-w-0 flex-1">
          <span className={level === 3 ? 'font-black text-foreground' : 'uppercase'}>{text}</span>
          {level === 2 ? (
            <span
              className="absolute -bottom-1 left-0 h-1 w-full origin-left scale-x-0 bg-primary/10 transition-transform group-hover:scale-x-100"
              aria-hidden
            />
          ) : null}
        </span>
      </Tag>
    </div>
  );
}

function PartitionBlock() {
  return (
    <div
      className={cn('mx-auto my-16 flex items-center gap-4 opacity-30', SHELL_CONTENT_MEASURE_CLASS)}
      role="separator"
      aria-hidden
    >
      <div className="h-[2px] flex-1 bg-border" />
      <Hash className="h-4 w-4 shrink-0" />
      <div className="h-[2px] flex-1 bg-border" />
    </div>
  );
}

function ImageBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const openPreview = useBlogImagePreview();
  const url = typeof payload?.url === 'string' ? payload.url : '';
  if (!url) return null;
  const title = ((payload?.title || payload?.caption) as string)?.trim() ?? '';
  const layout = coerceImageLayout(payload?.layout);
  const alt = title || 'Content image';
  return (
    <figure className={cn('my-12 w-full space-y-0', SHELL_CONTENT_MEASURE_CLASS)}>
      <ContentEmbedFrame module="IMAGE_RASTER" subtitle={title || 'Figure'}>
        <div className={cn('relative overflow-hidden bg-muted', embeddedFigureInnerClass(layout), 'group')}>
        <img
          src={url}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {openPreview ? (
          <button
            type="button"
            className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
            aria-label="Preview image"
            onClick={() => openPreview(url, alt)}
          />
        ) : null}
        {title ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20">
            <span className={RETRO_MEDIA_BADGE}>{title}</span>
          </div>
        ) : null}
        </div>
      </ContentEmbedFrame>
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
  let creditLine = '';
  if (photographer) {
    creditLine = /^Photo by/i.test(photographer)
      ? photographer
      : `Photo by ${photographer}`;
  }
  const unsplashPhotoHref = photoId
    ? `https://unsplash.com/photos/${encodeURIComponent(photoId)}`
    : 'https://unsplash.com';
  const alt = caption || creditLine || 'Photo';
  const embedSubtitle = caption || creditLine || 'Photo';

  return (
    <figure className={cn('my-12 w-full space-y-0', SHELL_CONTENT_MEASURE_CLASS)}>
      <ContentEmbedFrame module="UNSPLASH_NODE" subtitle={embedSubtitle}>
        <div className={cn('relative overflow-hidden bg-muted', embeddedFigureInnerClass(layout), 'group')}>
        <img
          src={url}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {openPreview ? (
          <button
            type="button"
            className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
            aria-label="Preview image"
            onClick={() => openPreview(url, alt)}
          />
        ) : null}
        {caption ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20">
            <span className={RETRO_MEDIA_BADGE}>{caption}</span>
          </div>
        ) : null}
        {creditLine ? (
          <div className="absolute bottom-3 right-3 z-30 max-w-[min(88%,16rem)]">
            <a
              href={unsplashPhotoHref}
              target="_blank"
              rel="noopener noreferrer"
              title="View on Unsplash"
              className={cn(RETRO_MEDIA_BADGE, 'pointer-events-auto hover:bg-white hover:text-black transition-colors')}
            >
              {creditLine}
            </a>
          </div>
        ) : null}
        </div>
      </ContentEmbedFrame>
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
    <div className={cn('my-10 w-full', SHELL_CONTENT_MEASURE_CLASS)}>
      <ContentEmbedFrame
        module="MEDIA_EMBED"
        subtitle={urls.length > 1 ? `${urls.length} sources` : 'Video'}
      >
        <div
          className={cn(
            'flex flex-wrap justify-center gap-4 p-3 sm:p-4',
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
          <div key={src} className={cn('relative overflow-hidden border-2 border-border shadow-[4px_4px_0_0_var(--border)]', itemClass)}>
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
      </ContentEmbedFrame>
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
  return (
    <div className={cn('my-10 w-full', SHELL_CONTENT_MEASURE_CLASS)}>
      <ContentEmbedFrame module="CODE_BLOCK" subtitle={languageHint ?? 'Snippet'}>
        <BlogCodeBlockDisplay code={code} languageHint={languageHint} />
      </ContentEmbedFrame>
    </div>
  );
}

function TableBlock({ payload }: Readonly<{ payload?: TablePayload }>) {
  const rows = payload?.rows ?? [];
  if (!rows.length) return null;
  const cap = (payload?.caption ?? '').trim();
  return (
    <figure className={cn('my-10 w-full', SHELL_CONTENT_MEASURE_CLASS)}>
      <ContentEmbedFrame module="TABLE_MODULE" subtitle={cap || 'Structured rows'}>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse font-mono text-left text-sm">
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={`tr-${ri}`}
                className={cn('border-b border-border last:border-0', ri === 0 && 'bg-muted font-bold')}
              >
                {row.map((cell, ci) => (
                  <td
                    key={`td-${ri}-${ci}`}
                    className="border-r border-border p-3 align-top text-foreground last:border-r-0"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </ContentEmbedFrame>
    </figure>
  );
}

function MermaidBlock({ payload }: Readonly<{ payload?: MermaidDiagramPayload }>) {
  const src = typeof payload?.source === 'string' ? payload.source : '';
  if (!src.trim()) return null;
  return (
    <div className={cn('my-10 w-full', SHELL_CONTENT_MEASURE_CLASS)}>
      <ContentEmbedFrame module="DIAGRAM_RENDER" subtitle={mermaidEmbedSubtitle(src)}>
        <div className="p-3 sm:p-4">
          <MermaidBlockDisplay source={src} />
        </div>
      </ContentEmbedFrame>
    </div>
  );
}

function GithubRepoBlock({ payload }: Readonly<{ payload?: Record<string, unknown> }>) {
  const owner = typeof payload?.owner === 'string' ? payload.owner : '';
  const repo = typeof payload?.repo === 'string' ? payload.repo : '';
  const name = typeof payload?.name === 'string' ? payload.name : repo;
  const description = typeof payload?.description === 'string' ? payload.description : '';
  const href = (payload?.url as string) || `https://github.com/${owner}/${repo}`;
  const avatarUrl = typeof payload?.avatarUrl === 'string' ? payload.avatarUrl.trim() : '';

  return (
    <div className={cn('my-10 w-full', SHELL_CONTENT_MEASURE_CLASS)}>
      <ContentEmbedFrame module="REPO_OBJECT" subtitle={owner && name ? `${owner}/${name}` : 'Repository'}>
        <div className="flex flex-col gap-4 p-5 transition-all sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-14 w-14 shrink-0 border-2 border-border object-cover shadow-[4px_4px_0_0_var(--border)]"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-border bg-muted shadow-[4px_4px_0_0_var(--border)]">
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
      </ContentEmbedFrame>
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
    <div className="public-blog-body w-full">
      {blocks.map((block) => (
        <PublicBlogBlock key={block.id} block={block} />
      ))}
    </div>
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
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const pct = totalScroll <= 0 ? 0 : (y / totalScroll) * 100;
      setScrollProgress(Math.min(100, Math.max(0, pct)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  if (loading) {
    return (
      <div className="public-blog-post-page min-h-screen bg-background text-foreground">
        <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'py-8 md:py-16')}>
          <div className="w-full border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)]">
            <div className="border-b-4 border-border px-4 py-10 sm:px-6 lg:px-8 md:py-16">
              <div className="mb-8 flex flex-wrap gap-3">
                <div className="h-8 w-40 animate-pulse bg-muted sm:h-9" aria-hidden />
                <div className="h-8 w-32 animate-pulse bg-muted/70 sm:h-9" aria-hidden />
              </div>
              <div className="mb-10 space-y-3 md:space-y-4">
                <div className="h-10 w-full max-w-4xl animate-pulse bg-muted md:h-14" aria-hidden />
                <div className="h-10 w-[92%] max-w-3xl animate-pulse bg-muted md:h-14" aria-hidden />
                <div className="h-10 w-[64%] max-w-2xl animate-pulse bg-muted md:h-14" aria-hidden />
              </div>
              <div className="border-l-4 border-primary/25 bg-muted/10 p-6 md:p-8">
                <div className="mb-4 h-3 w-36 animate-pulse bg-muted/80" aria-hidden />
                <div className="space-y-2">
                  <div className="h-2.5 w-full animate-pulse bg-muted" aria-hidden />
                  <div className="h-2.5 w-full animate-pulse bg-muted" aria-hidden />
                  <div className="h-2.5 w-[78%] animate-pulse bg-muted" aria-hidden />
                </div>
              </div>
              <div className="mt-8 flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase text-muted-foreground">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
                Initializing_Stream…
              </div>
            </div>
            <div className="px-4 py-10 sm:px-6 lg:px-8 md:py-14">
              <div className={cn('space-y-3', SHELL_CONTENT_MEASURE_CLASS)}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={`blog-post-sk-${i}`}
                    className="h-2.5 animate-pulse bg-muted"
                    style={{ width: i % 4 === 0 ? '100%' : i % 4 === 1 ? '96%' : i % 4 === 2 ? '88%' : '72%' }}
                    aria-hidden
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md border-4 border-destructive bg-destructive/5 p-10 shadow-[8px_8px_0px_0px_var(--destructive)]">
          <AlertTriangle className="mb-4 h-12 w-12 text-destructive" aria-hidden />
          <h1 className="mb-4 font-mono text-2xl font-black uppercase text-destructive">Access_Denied</h1>
          <p className="mb-8 font-mono text-sm leading-relaxed opacity-80">
            {error ??
              'The requested document does not exist or has been retracted from the public index.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border-2 border-destructive px-6 py-3 font-mono text-sm font-black uppercase transition-all hover:bg-destructive hover:text-white"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
            Return_To_Terminal
          </Link>
        </div>
      </div>
    );
  }

  const plainSummary = summaryToPlainText(post.summary);
  const summaryLooksHtml = /<[a-z][\s\S]*>/i.test(post.summary ?? '');
  const hasSummary = Boolean(post.summary?.trim());
  const dateRaw = post.updatedAt?.trim() || post.createdAt?.trim() || '';
  const publishedDate = dateRaw ? new Date(dateRaw) : null;
  const dateValid = publishedDate && !Number.isNaN(publishedDate.getTime());
  const dateStrLong =
    dateValid
      ? publishedDate.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : '—';
  const dateStrShort =
    dateValid
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

  const postId = post._id;
  const indexId = postId.length >= 8 ? postId.slice(0, 8) : postId;
  const refSuffix = postId.length >= 4 ? postId.slice(-4) : postId;

  return (
    <BlogImagePreviewProvider>
      <div className="public-blog-post-page min-h-screen  text-foreground selection:bg-primary selection:text-primary-foreground">
        <div
          className="fixed top-0 left-0 z-50 h-1.5 bg-primary transition-[width] duration-75"
          style={{ width: `${scrollProgress}%` }}
          aria-hidden
        />

        <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'py-8 md:py-16')}>
          <article className={cn('w-full border-4 border-border bg-card', CARD_SHADOW)}>
            <header className="relative overflow-hidden border-b-4 border-border px-4 py-10 sm:px-6 lg:px-8 md:py-16">
              <div className="pointer-events-none absolute top-0 right-0 origin-top-right rotate-90 p-4 font-mono text-[10px] whitespace-nowrap text-muted-foreground/20">
                {'SECURE_CONNECTION_STABLE // BUILT_WITH_MODERN_WEB'}
              </div>

              <div className="mb-8 flex flex-wrap items-center gap-4">
                <time
                  dateTime={dateRaw || undefined}
                  className="flex items-center gap-2 border-2 border-border bg-muted/50 px-3 py-1 font-mono text-xs font-bold uppercase"
                >
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                  {dateStrLong}
                </time>
                {showEditedForAuthorOnly ? (
                  <div className="flex items-center gap-2 border-2 border-amber-500/30 bg-amber-500/5 px-3 py-1 font-mono text-xs font-bold uppercase text-amber-600 dark:text-amber-400">
                    <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Edited{' '}
                    {new Date(post.lastEditedAt!).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {post.lastEditedBy?.fullName || post.lastEditedBy?.username
                      ? ` · ${post.lastEditedBy.fullName ?? post.lastEditedBy.username}`
                      : ''}
                  </div>
                ) : null}
              </div>

              <h1 className="mb-10 text-balance font-mono text-4xl font-black uppercase leading-[0.95] tracking-tighter sm:text-5xl md:text-7xl lg:text-8xl">
                {post.title}
              </h1>

              {hasSummary ? (
                <div className="group relative mb-10">
                  <div className="absolute -left-12 top-0 bottom-0 hidden w-1 bg-primary/20 md:block" aria-hidden />
                  <div className="border-l-4 border-primary bg-primary/5 p-6 md:p-8">
                    <div className="mb-4 flex items-center gap-2">
                      <Terminal className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                      <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                        Briefing_Field
                      </span>
                    </div>
                    <div className="text-lg font-medium leading-relaxed text-foreground/80 italic [&_a]:not-[class]:text-primary">
                      {summaryLooksHtml ? (
                        <div
                          className="max-w-none [&_a]:underline [&_br]:block [&_em]:not-italic [&_strong]:font-semibold"
                          dangerouslySetInnerHTML={{ __html: post.summary }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">{plainSummary}</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between border-t-2 border-dashed border-border/30 pt-8">
                <BlogPostAuthor author={post.author} />
                <div className="hidden text-right font-mono text-[10px] uppercase text-muted-foreground sm:block">
                  Index_ID: {indexId}
                  <br />
                  Status: Published · {dateStrShort}
                </div>
              </div>
            </header>

            <div className="px-4 py-10 sm:px-6 lg:px-8 md:py-16">
              <div className="prose-retro">
                <BlogPublicBody content={post.content} />
              </div>

              <div className="mt-20 border-t-4 border-border pt-12">
                <div className="mb-8 flex flex-wrap items-center gap-3">
                  <div className="h-8 w-1 bg-primary" aria-hidden />
                  <h2 className="font-mono text-xl font-black uppercase tracking-tight">Signal_Channel</h2>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    · comments
                  </span>
                </div>
                <BlogCommentsSection username={username} slug={slug} />
              </div>
            </div>

            <footer className="flex flex-col items-center justify-between gap-6 border-t-4 border-border bg-muted/30 p-8 md:flex-row md:px-8 lg:px-10">
              <div className="flex items-center gap-3 font-mono text-xs font-bold uppercase text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />
                END_OF_TRANSMISSION {' // '}{new Date().getFullYear()}
              </div>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={cn(
                  'flex items-center gap-2 border-2 border-border bg-card px-6 py-2 font-mono text-xs font-black uppercase shadow-[4px_4px_0_0_var(--border)] transition-all',
                  'hover:bg-primary hover:text-primary-foreground hover:shadow-none active:translate-y-1',
                )}
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
                Top
              </button>
            </footer>
          </article>

          <div className="mt-8 flex justify-between px-2 font-mono text-[10px] uppercase text-muted-foreground opacity-40">
            <span>
              Lat: {username.length}.{slug.length}
              {' // '}
              Node: Web-Public
            </span>
            <span>Ref: 000-X-{refSuffix}</span>
          </div>
        </div>
      </div>
    </BlogImagePreviewProvider>
  );
}