'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Terminal,
} from 'lucide-react';
import { blogApi } from '@/api/blog';
import { LinkPreviewCardContent } from '@/components/ui/popover';
import { RichParagraphEditor } from '@/components/ui/editor';
import { GithubIcon } from '@/components/icons/SocialProviderIcons';
import { cn } from '@/lib/core/utils';
import { sanitizePublicSummaryHtml, summaryToPlainText } from '@/lib/blog/summaryPlain';
import { coerceImageLayout } from '@/lib/blog/blogImageLayout';
import type {
  Block,
  ImageBlockLayout,
  MermaidDiagramPayload,
  ParagraphPayload,
  PublicBlogPostDetail,
  PublicFeedPost,
  TablePayload,
  VideoEmbedDisplaySize,
  VideoEmbedLayoutDirection,
  VideoEmbedPayload,
} from '@/types/blog';
import { coerceParagraphDoc } from '@/types/blog';
import {
  BlogCodeBlockDisplay,
  BlogCommentsSection,
  BlogImagePreviewProvider,
  BlogPostCommentsDock,
  BlogPostDetailSideRail,
  BlogPostSidebarStats,
  BlogPostTableOfContents,
  MermaidBlockDisplay,
  useBlogImagePreview,
  type BlogDockEngagement,
} from '../post-detail/blogPostDetailSections';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/auth';
import { extractBlogHeadingToc } from '@/lib/extractBlogHeadingToc';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';
import { SHELL_CONTENT_MEASURE_CLASS, SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { BlogPostPageSkeletonInner } from '@/components/skeletons';


/** Cancels article body horizontal padding (`px-3 sm:px-4 lg:px-5`) so full-width media meets the article edges. */
const BLOG_ARTICLE_FULL_BLEED_CLASS =
  '-mx-3 w-[calc(100%+1.5rem)] max-w-none sm:-mx-4 sm:w-[calc(100%+2rem)] lg:-mx-5 lg:w-[calc(100%+2.5rem)]';

/** Centered square embed (raster / Unsplash). */
const BLOG_SQUARE_EMBED_MAX_CLASS = 'w-full max-w-xl shrink-0';

/** Centered landscape embed — narrower than full content measure. */
const BLOG_LANDSCAPE_EMBED_MAX_CLASS = 'w-full max-w-2xl shrink-0';

/** Layout-only; transform/transition live in `globals.css` (`.ss-blog-raster-hover*`) for reliable easing. */
const BLOG_RASTER_IMG_CLASS = 'ss-blog-raster-hover absolute inset-0 h-full w-full object-cover';
const BLOG_RASTER_HOVER_GROUP_CLASS = 'ss-blog-raster-hover-group';

function BlogHeroThumbnailPreview({
  src,
  alt,
}: Readonly<{
  src: string;
  alt: string;
}>) {
  const openPreview = useBlogImagePreview();
  return (
    <div className="relative mb-8 overflow-hidden border border-dashed border-muted-foreground/40 bg-muted/10">
      {openPreview ? (
        <button
          type="button"
          className="absolute inset-0 z-10 cursor-zoom-in bg-transparent"
          aria-label="Open image preview"
          onClick={() => openPreview(src, alt)}
        />
      ) : null}
      <img
        src={src}
        alt={alt}
        className="pointer-events-none h-auto w-full max-h-[min(60vh,32rem)] object-cover"
      />
    </div>
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
  'inline-flex max-w-[min(92%,20rem)] items-center border-2 border-white/40 bg-black/80 px-2.5 py-1 font-mono text-[9px] font-bold uppercase leading-snug tracking-wider text-white shadow';

function ContentEmbedFrame({
  module,
  subtitle,
  children,
  className,
  showEmbedBadge = true,
  noShadow = false,
}: Readonly<{
  module: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  showEmbedBadge?: boolean;
  noShadow?: boolean;
}>) {
  return (
    <div
      className={cn(
        'overflow-hidden border-2 border-border bg-card',
        noShadow
          ? 'shadow-none'
          : 'shadow transition-shadow duration-200 hover:shadow',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 border-b-2 border-border bg-muted/40 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-foreground',
          showEmbedBadge ? 'justify-between' : 'justify-start',
        )}
      >
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
        {showEmbedBadge ? (
          <span className="shrink-0 border border-border bg-background px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
            EMBED
          </span>
        ) : null}
      </div>
      <div className="bg-background">{children}</div>
    </div>
  );
}

function embeddedFigureInnerClass(
  layout: ImageBlockLayout,
  opts?: Readonly<{ squareInNarrowEmbed?: boolean }>,
): string {
  switch (layout) {
    case 'square':
      /* Parent width caps the square (see BLOG_SQUARE_EMBED_MAX_CLASS on the embed). */
      if (opts?.squareInNarrowEmbed) {
        return 'relative aspect-square w-full min-h-0 min-w-0 ';
      }
      return 'mx-auto aspect-square w-full min-h-0 min-w-0 max-w-xl ';
    case 'fullWidth':
      return 'w-full min-h-[20rem] max-h-[min(42rem,88vh)]  sm:min-h-[22rem] lg:min-h-[26rem]';
    case 'landscape':
    default:
      return 'aspect-video w-full ';
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
    <div className={cn('relative mx-auto mb-6', SHELL_CONTENT_MEASURE_CLASS)}>
      <RichParagraphEditor
        initialDoc={doc}
        legacyText={p.text}
        readOnly
        className="!border-none !bg-transparent !p-0 !shadow-none text-[15px] leading-[1.65] text-foreground/90 selection:bg-primary/30"
        readOnlyLinkPreview={paragraphPreviewCard}
      />
    </div>
  );
}

function HeadingBlock({
  blockId,
  payload,
}: Readonly<{ blockId: string; payload?: Record<string, unknown> }>) {
  const text = (payload?.text as string) ?? '';
  const level = payload?.level === 3 ? 3 : 2;
  const Tag = level === 3 ? 'h3' : 'h2';
  const anchorId = `blog-heading-${blockId}`;
  return (
    <div
      id={anchorId}
      className={cn(
        /* Match sticky rail offset (`top-24`) so TOC scroll targets clear the navbar */
        'mx-auto mb-6 w-full scroll-mt-24',
        SHELL_CONTENT_MEASURE_CLASS,
        level === 3 ? 'mt-8' : 'mt-12',
      )}
    >
      <Tag
        className={cn(
          'flex items-center gap-3 font-mono font-black tracking-tight text-foreground',
          level === 3
            ? 'border-l-4 border-primary/50 pl-4 text-base normal-case sm:text-lg'
            : 'text-2xl uppercase sm:text-3xl',
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
  const fullBleed = layout === 'fullWidth';
  const squareCard = layout === 'square' && !fullBleed;
  const landscapeCard = layout === 'landscape' && !fullBleed;
  const narrowEmbedClass = squareCard
    ? BLOG_SQUARE_EMBED_MAX_CLASS
    : landscapeCard
      ? BLOG_LANDSCAPE_EMBED_MAX_CLASS
      : undefined;
  const inner = (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        embeddedFigureInnerClass(layout, { squareInNarrowEmbed: squareCard }),
        BLOG_RASTER_HOVER_GROUP_CLASS,
      )}
    >
      <img src={url} alt={alt} className={BLOG_RASTER_IMG_CLASS} />
      {openPreview ? (
        <button
          type="button"
          className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
          aria-label="Preview image"
          onClick={() => openPreview(url, alt)}
        />
      ) : null}
      {title ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-[min(92%,20rem)] min-w-0">
          <span
            className={cn(
              RETRO_MEDIA_BADGE,
              'min-w-0 max-w-full justify-start overflow-hidden text-ellipsis whitespace-nowrap',
            )}
          >
            {title}
          </span>
        </div>
      ) : null}
    </div>
  );
  return (
    <figure
      className={cn(
        'my-12 w-full space-y-0',
        fullBleed ? BLOG_ARTICLE_FULL_BLEED_CLASS : SHELL_CONTENT_MEASURE_CLASS,
        (squareCard || landscapeCard) && 'flex justify-center',
      )}
    >
      {fullBleed ? (
        inner
      ) : (
        <ContentEmbedFrame
          module="IMAGE_RASTER"
          subtitle={title || 'Figure'}
          showEmbedBadge={false}
          noShadow={squareCard}
          className={narrowEmbedClass}
        >
          {inner}
        </ContentEmbedFrame>
      )}
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

  const fullBleed = layout === 'fullWidth';
  const squareCard = layout === 'square' && !fullBleed;
  const landscapeCard = layout === 'landscape' && !fullBleed;
  const narrowEmbedClass = squareCard
    ? BLOG_SQUARE_EMBED_MAX_CLASS
    : landscapeCard
      ? BLOG_LANDSCAPE_EMBED_MAX_CLASS
      : undefined;
  const inner = (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        embeddedFigureInnerClass(layout, { squareInNarrowEmbed: squareCard }),
        BLOG_RASTER_HOVER_GROUP_CLASS,
      )}
    >
      <img src={url} alt={alt} className={BLOG_RASTER_IMG_CLASS} />
      {openPreview ? (
        <button
          type="button"
          className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
          aria-label="Preview image"
          onClick={() => openPreview(url, alt)}
        />
      ) : null}
      {caption ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-[min(92%,20rem)] min-w-0">
          <span
            className={cn(
              RETRO_MEDIA_BADGE,
              'min-w-0 max-w-full justify-start overflow-hidden text-ellipsis whitespace-nowrap',
            )}
          >
            {caption}
          </span>
        </div>
      ) : null}
      {creditLine ? (
        <div className="absolute bottom-3 right-3 z-30 max-w-[min(92%,18rem)] min-w-0">
          <a
            href={unsplashPhotoHref}
            target="_blank"
            rel="noopener noreferrer"
            title="View on Unsplash"
            className={cn(
              RETRO_MEDIA_BADGE,
              'blog-figure-credit-link pointer-events-auto block min-w-0 truncate whitespace-nowrap !text-white',
              'shadow-none hover:bg-black/90 hover:!text-white',
              'transition-colors duration-300',
            )}
          >
            {creditLine}
          </a>
        </div>
      ) : null}
    </div>
  );
  return (
    <figure
      className={cn(
        'my-12 w-full space-y-0',
        fullBleed ? BLOG_ARTICLE_FULL_BLEED_CLASS : SHELL_CONTENT_MEASURE_CLASS,
        (squareCard || landscapeCard) && 'flex justify-center',
      )}
    >
      {fullBleed ? (
        inner
      ) : (
        <ContentEmbedFrame
          module="UNSPLASH_NODE"
          subtitle={embedSubtitle}
          showEmbedBadge={false}
          noShadow
          className={narrowEmbedClass}
        >
          {inner}
        </ContentEmbedFrame>
      )}
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
        showEmbedBadge={false}
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
          <div key={src} className={cn('relative overflow-hidden border-2 border-border shadow', itemClass)}>
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
    <div className={cn('my-8 w-full', SHELL_CONTENT_MEASURE_CLASS)}>
      <BlogCodeBlockDisplay code={code} languageHint={languageHint} className="my-0 max-w-none" />
    </div>
  );
}

function TableBlock({ payload }: Readonly<{ payload?: TablePayload }>) {
  const rows = payload?.rows ?? [];
  if (!rows.length) return null;
  const cap = (payload?.caption ?? '').trim();
  return (
    <figure className={cn('my-8 w-full overflow-hidden border-2 border-border bg-background', SHELL_CONTENT_MEASURE_CLASS)}>
      <div className="flex items-center gap-2 border-b-2 border-border bg-muted/30 px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-foreground">
        <span className="shrink-0 text-primary" aria-hidden>
          ▣
        </span>
        <span className="shrink-0">TABLE_MODULE</span>
        {cap ? (
          <span className="min-w-0 truncate text-[8px] font-bold normal-case tracking-normal text-muted-foreground sm:text-[9px]">
            <span className="mx-1 text-border" aria-hidden>
              ·
            </span>
            {cap}
          </span>
        ) : null}
      </div>
      <div className="overflow-x-auto bg-background">
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
                    className="border-r border-border p-2.5 align-top text-foreground last:border-r-0 sm:p-3"
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
  return (
    <div className={cn('my-8 w-full', SHELL_CONTENT_MEASURE_CLASS)}>
      <ContentEmbedFrame
        module="DIAGRAM_RENDER"
        subtitle={mermaidEmbedSubtitle(src)}
        showEmbedBadge={false}
        noShadow
      >
        <div className="bg-background p-3 sm:p-4">
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
      <ContentEmbedFrame
        module="REPO_OBJECT"
        subtitle={owner && name ? `${owner}/${name}` : 'Repository'}
        showEmbedBadge={false}
        noShadow
      >
        <div className="flex flex-col gap-4 p-5 transition-all sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-14 w-14 shrink-0 border-2 border-border object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-border bg-muted">
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
      <Button
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        variant="primary"
        size="sm"
        className="shrink-0 font-mono normal-case tracking-normal"
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Open on GitHub
      </Button>
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
      return <HeadingBlock blockId={block.id} payload={payload} />;
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
  const token = useAuthStore((s) => s.token);
  const [post, setPost] = useState<PublicBlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [rail, setRail] = useState<{ more: PublicFeedPost[] } | null>(null);
  const [dockCommentStats, setDockCommentStats] = useState<{ total: number; loading: boolean }>({
    total: 0,
    loading: true,
  });
  const [dockEngagement, setDockEngagement] = useState<BlogDockEngagement>({
    respectCount: 0,
    repostCount: 0,
    bookmarkCount: 0,
    viewCount: 0,
    viewerHasRespected: false,
    viewerHasReposted: false,
    viewerHasBookmarked: false,
  });

  /** Keeps `post` in sync when the dock mutates Respect / Repost / Bookmark so reload isn’t needed and stats stream state stays coherent. */
  const applyDockEngagementFromApi = useCallback((next: BlogDockEngagement) => {
    setPost((p) => {
      if (!p) return p;
      return {
        ...p,
        respectCount: next.respectCount,
        repostCount: next.repostCount,
        bookmarkCount: next.bookmarkCount,
        viewCount: next.viewCount,
        viewerHasRespected: next.viewerHasRespected,
        viewerHasReposted: next.viewerHasReposted,
        viewerHasBookmarked: next.viewerHasBookmarked,
      };
    });
  }, []);

  const tocItems = useMemo(
    () => (post ? extractBlogHeadingToc(parseBlocks(post.content)) : []),
    [post],
  );
  const hasToc = tocItems.length > 0;

  const summaryHtmlSafe = useMemo(
    () => sanitizePublicSummaryHtml(post?.summary ?? ''),
    [post?.summary],
  );

  useEffect(() => {
    const updateProgress = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      const pct = totalScroll <= 0 ? 0 : (y / totalScroll) * 100;
      setScrollProgress(Math.min(100, Math.max(0, pct)));
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [post?._id]);

  useEffect(() => {
    const load = async () => {
      if (!username || !slug) return;
      try {
        const { post: p } = await blogApi.getPublishedPost(username, slug, token);
        setPost(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Post not found');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [username, slug, token]);

  useEffect(() => {
    if (!post) return;
    setDockEngagement({
      respectCount: post.respectCount ?? 0,
      repostCount: post.repostCount ?? 0,
      bookmarkCount: post.bookmarkCount ?? 0,
      viewCount: post.viewCount ?? 0,
      viewerHasRespected: post.viewerHasRespected ?? false,
      viewerHasReposted: post.viewerHasReposted ?? false,
      viewerHasBookmarked: post.viewerHasBookmarked ?? false,
    });
  }, [post]);

  useEffect(() => {
    if (!username || !slug || !post) return;
    const base = resolvePublicApiBase();
    if (!base) return;
    const url = `${base}/api/blog/p/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/stats/stream`;
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data) as {
          type?: string;
          stats?: {
            respectCount?: number;
            repostCount?: number;
            bookmarkCount?: number;
            commentCount?: number;
            viewCount?: number;
          };
        };
        if ((d.type === 'snapshot' || d.type === 'update') && d.stats) {
          setDockEngagement((prev) => ({
            ...prev,
            respectCount:
              typeof d.stats!.respectCount === 'number' ? d.stats!.respectCount! : prev.respectCount,
            repostCount: typeof d.stats!.repostCount === 'number' ? d.stats!.repostCount! : prev.repostCount,
            bookmarkCount:
              typeof d.stats!.bookmarkCount === 'number' ? d.stats!.bookmarkCount! : prev.bookmarkCount,
            viewCount: typeof d.stats!.viewCount === 'number' ? d.stats!.viewCount! : prev.viewCount,
          }));
          if (typeof d.stats!.commentCount === 'number') {
            setDockCommentStats({ total: d.stats!.commentCount!, loading: false });
          }
        }
      } catch {
        /* ignore malformed */
      }
    };
    return () => es.close();
  }, [username, slug, post?._id]);

  useEffect(() => {
    if (!username || !slug) return;
    let cancelled = false;
    setRail(null);
    (async () => {
      try {
        const authorRes = await blogApi.getUserPublishedPosts(username, 12);
        if (cancelled) return;
        const more = authorRes.posts.filter((p) => p.slug !== slug).slice(0, 5);
        setRail({ more });
      } catch {
        if (!cancelled) setRail({ more: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, slug]);

  useEffect(() => {
    if (!post || !token) return;
    const authorU = post.author.username.trim().toLowerCase();
    const viewerU = (viewerUsername ?? '').trim().toLowerCase();
    if (!viewerU || viewerU === authorU) return;

    let cancelled = false;

    const run = async () => {
      try {
        const start = await blogApi.startReadView(username, slug, token);
        if (cancelled) return;
        if (start.kind === 'self') return;

        const dwellMs = start.minDwellMs;
        await new Promise((r) => setTimeout(r, dwellMs));
        if (cancelled) return;

        if (start.kind === 'redis_unavailable') {
          void blogApi.recordReadDay(username, slug, token).catch(() => {
            /* best-effort */
          });
          return;
        }

        try {
          await blogApi.commitReadView(username, slug, token, start.sessionId);
        } catch {
          void blogApi.recordReadDay(username, slug, token).catch(() => {
            /* best-effort */
          });
        }
      } catch {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 10_000));
        if (cancelled) return;
        void blogApi.recordReadDay(username, slug, token).catch(() => {
          /* best-effort */
        });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [post, token, username, slug, viewerUsername]);

  if (loading) {
    return <BlogPostPageSkeletonInner />;
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
        <div className="max-w-md border-4 border-destructive bg-destructive/5 p-10 shadow">
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

  const showEditedForAuthorOnly = Boolean(
    viewerUsername &&
      post.author?.username &&
      viewerUsername === post.author.username &&
      post.lastEditedAt?.trim(),
  );

  const heroThumbnail = post.thumbnailUrl?.trim() ?? '';

  return (
    <BlogImagePreviewProvider>
      <div className="public-blog-post-page relative flex min-h-screen w-full flex-col bg-transparent text-foreground selection:bg-primary selection:text-primary-foreground">
        <div
          className="fixed top-0 left-0 z-[100] h-1.5 bg-primary transition-[width] duration-75"
          style={{ width: `${scrollProgress}%` }}
          aria-hidden
        />

        <div
          className={cn(
            SHELL_CONTENT_RAIL_CLASS,
            'relative flex-1 !overflow-visible',
          )}
        >
          <div className="flex flex-col gap-6 !overflow-visible bg-transparent xl:flex-row xl:items-start xl:gap-6">
            <aside className="sticky top-24 z-20 hidden w-[11.5rem] max-w-[11.5rem] shrink-0 self-start xl:block">
              <div className="flex max-h-[calc(100vh-8rem)] min-h-0 flex-col gap-4 pr-2">
                <div className="shrink-0">
                  <BlogPostSidebarStats
                    respectCount={dockEngagement.respectCount}
                    repostCount={dockEngagement.repostCount}
                    bookmarkCount={dockEngagement.bookmarkCount}
                    viewCount={dockEngagement.viewCount}
                    commentTotal={dockCommentStats.total}
                    commentLoading={dockCommentStats.loading}
                  />
                </div>
                {hasToc ? (
                  <div className="min-h-0 flex-1">
                    <BlogPostTableOfContents items={tocItems} />
                  </div>
                ) : null}
              </div>
            </aside>

            <main className="min-w-0 flex-1 bg-background">
              <article className="w-full border-2 border-border bg-transparent">
                <header className="relative overflow-hidden border-0 px-3 py-6 sm:px-4 lg:px-5 md:py-10">
                  <div className="pointer-events-none absolute top-0 right-0 origin-top-right rotate-90 p-4 font-mono text-[10px] whitespace-nowrap text-muted-foreground/20">
                    {'SECURE_CONNECTION_STABLE // BUILT_WITH_MODERN_WEB'}
                  </div>

                  <div className={cn(SHELL_CONTENT_MEASURE_CLASS, 'min-w-0')}>
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

                    <h1 className="mb-8 w-full min-w-0 max-w-none text-pretty font-mono text-3xl font-black uppercase leading-[0.95] tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                      {post.title}
                    </h1>

                    {heroThumbnail ? (
                      <BlogHeroThumbnailPreview src={heroThumbnail} alt={post.title} />
                    ) : null}

                    {hasSummary ? (
                      <div className="group relative border-b border-dashed border-muted-foreground/40 pb-0">
                        <div className="absolute -left-12 top-0 bottom-0 hidden w-1 bg-primary/20 md:block" aria-hidden />
                        <div className="border-l-4 border-primary bg-primary/5 p-4 pb-3 md:p-5 md:pb-4">
                          <div className="mb-2 flex items-center gap-2">
                            <Terminal className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                            <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                              Briefing_Field
                            </span>
                          </div>
                          <div className="text-base font-medium leading-relaxed text-foreground/80 italic [&_a]:not-[class]:text-primary">
                            {summaryLooksHtml ? (
                              summaryHtmlSafe.trim() ? (
                                <div
                                  className="max-w-none [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_p:empty]:hidden [&_a]:underline [&_br]:block [&_em]:not-italic [&_strong]:font-semibold"
                                  dangerouslySetInnerHTML={{ __html: summaryHtmlSafe }}
                                />
                              ) : (
                                <div>{plainSummary}</div>
                              )
                            ) : (
                              <div>{plainSummary}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </header>

            <div className="px-3 pt-2 pb-6 sm:px-4 lg:px-5 md:pt-3 md:pb-10">
              <div className="prose-retro [&_.public-blog-body>div:first-child]:mt-0">
                <BlogPublicBody content={post.content} />
              </div>

              <section
                id="blog-comments-section"
                className={cn(
                  'mt-12 border-t border-dashed border-muted-foreground/40 pt-8',
                  'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]',
                )}
                aria-labelledby="blog-comments-heading"
              >
                <BlogCommentsSection
                  username={username}
                  slug={slug}
                  hideTitle
                  onCommentStatsChange={setDockCommentStats}
                />
              </section>
            </div>

            <footer className="flex flex-col items-center justify-between gap-3 border-t border-dashed border-muted-foreground/35 bg-muted/20 px-5 py-3 md:flex-row md:px-5 lg:px-6">
              <div className="flex items-center gap-3 font-mono text-xs font-bold uppercase text-muted-foreground">
                <span className="size-2 animate-pulse bg-primary" aria-hidden />
                END_OF_TRANSMISSION {' // '}{new Date().getFullYear()}
              </div>
              <button
                type="button"
                onClick={() => {
                  globalThis.window?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cn(
                  'flex items-center gap-2 border-2 border-border bg-card px-6 py-2 font-mono text-xs font-black uppercase shadow transition-all',
                  'hover:bg-primary hover:text-primary-foreground hover:shadow-none active:translate-y-1',
                )}
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
                Top
              </button>
            </footer>
              </article>
            </main>

            <aside className="sticky top-24 z-20 hidden w-[17.5rem] max-w-[17.5rem] shrink-0 self-start xl:block">
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto pl-1 pr-2 ss-scrollbar-hide">
                <BlogPostDetailSideRail
                  username={username}
                  slug={slug}
                  author={post.author}
                  postTitle={post.title}
                  moreByAuthor={rail?.more ?? []}
                  loading={rail === null}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
      <BlogPostCommentsDock
        username={username}
        slug={slug}
        commentCount={dockCommentStats.total}
        commentCountLoading={dockCommentStats.loading}
        engagement={dockEngagement}
        onEngagementChange={applyDockEngagementFromApi}
      />
    </BlogImagePreviewProvider>
  );
}