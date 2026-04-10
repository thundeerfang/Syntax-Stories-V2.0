import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import {
  Trash2,
  Image as ImageIcon,
  Film,
  Camera,
  ExternalLink,
  X,
  Type,
  GripVertical,
  Info,
  AlignLeft,
  Square,
  StretchHorizontal,
  StretchVertical,
  Upload,
} from 'lucide-react';
import { GithubIcon } from '@/components/icons/SocialProviderIcons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { uploadMedia } from '@/api/upload';
import { searchUnsplashPhotos, type UnsplashPhoto } from '@/api/unsplash';
import { fetchRepoByUrl, fetchMyRepos, parseGithubRepoUrl, type GithubRepoListItem } from '@/api/github';
import type {
  ImageBlockLayout,
  ImagePayload,
  ParagraphPayload,
  VideoEmbedDisplaySize,
  VideoEmbedLayoutDirection,
  VideoEmbedPayload,
} from '@/types/blog';
import { coerceParagraphDoc } from '@/types/blog';
import { normalizeVideoEmbedUrl, youtubeThumbnailUrl } from '@/lib/videoEmbed';
import { RichParagraphEditor } from '@/components/ui/RichParagraphEditor';
import { ParagraphBlockHelpDialog } from '@/components/blog/dialog';

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'partition'
  | 'image'
  | 'videoEmbed'
  | 'link'
  | 'githubRepo'
  | 'unsplashImage';

export type HeadingLevel = 2 | 3;

export interface BlockBase {
  id: string;
  type: BlockType;
  sectionId?: string;
}

export interface ParagraphBlock extends BlockBase {
  type: 'paragraph';
  payload: ParagraphPayload;
}

export interface HeadingBlock extends BlockBase {
  type: 'heading';
  payload: { text: string; level?: HeadingLevel };
}

export type Block = ParagraphBlock | HeadingBlock | (BlockBase & { payload?: any });

// Simple helper matching the older API: create a paragraph in default section "s-1"
export function createBlock(type: BlockType): Block {
  return createBlockInSection(type, 's-1');
}

export function createBlockInSection(type: BlockType, sectionId: string): Block {
  const id = `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  if (type === 'paragraph') {
    return { id, type: 'paragraph', sectionId, payload: { text: '' } };
  }
  if (type === 'heading') {
    return { id, type: 'heading', sectionId, payload: { text: '', level: 2 as HeadingLevel } };
  }
  return { id, type, sectionId, payload: {} };
}

/** Removes legacy standalone `gif` blocks (toolbar block type was removed). */
export function stripLegacyGifBlocks(blocks: Block[]): Block[] {
  return blocks.filter((b) => (b as { type?: string }).type !== 'gif');
}

const IMAGE_ACCEPT = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
const IMAGE_MAX_MB = 5;
const VIDEO_EMBED_MAX = 3;

const UL_ITEM_LINE = /^\s*[-*]\s+(.*)$/;
const OL_ITEM_LINE = /^\s*\d+\.\s+(.*)$/;

function getBrowserSelection(): Selection | null {
  if (typeof document === 'undefined') return null;
  return document.getSelection();
}

function consumeMarkdownListBlock(
  lines: string[],
  start: number,
  pattern: RegExp,
  wrap: (inner: string) => string,
  inline: (s: string) => string,
): { html: string; next: number } | null {
  if (!pattern.exec(lines[start] ?? '')) return null;
  let i = start;
  let inner = '';
  while (i < lines.length) {
    const m = pattern.exec(lines[i] ?? '');
    if (!m) break;
    inner += '<li>' + inline(m[1] ?? '') + '</li>';
    i++;
  }
  return { html: wrap(inner), next: i };
}

/** Stored in paragraph `payload.text` (persisted in `BlogPost.content` JSON). */
const MENTION_WITH_ID_RE = /\[(@[^\]]+)\]\(mention:([a-fA-F0-9]{24})\)/g;

function ParagraphBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: ParagraphPayload;
  onUpdate: (p: ParagraphPayload) => void;
  onRemove: () => void;
}>) {
  const [helpOpen, setHelpOpen] = useState(false);
  const effectiveDoc: any = payload.doc ?? coerceParagraphDoc(payload);

  return (
    <div className="group border-2 border-border bg-card p-3 space-y-2 rounded-md">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
        <span className="flex items-center gap-2">
          <Type className="h-3.5 w-3.5" /> Paragraph
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            className="text-muted-foreground hover:text-primary p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
            onClick={() => setHelpOpen(true)}
            aria-label="Paragraph block help"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="text-destructive hover:text-destructive/80 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-destructive/50"
            onClick={onRemove}
            aria-label="Remove paragraph"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <RichParagraphEditor
        initialDoc={effectiveDoc}
        legacyText={payload.text}
        onChange={(nextDoc) => onUpdate({ ...payload, doc: nextDoc, version: 'rich-text' })}
      />
      <ParagraphBlockHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

function HeadingBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: { text: string; level?: HeadingLevel };
  onUpdate: (p: { text: string; level?: HeadingLevel }) => void;
  onRemove: () => void;
}>) {
  const text = payload?.text ?? '';
  const level = (payload?.level === 3 ? 3 : 2) as HeadingLevel;
  const sizeClass = {
    2: 'text-2xl md:text-3xl font-black',
    3: 'text-xl md:text-2xl font-bold',
  }[level];

  return (
    <div className="border-2 border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
        <span className="flex items-center gap-2">
          <Type className="h-3.5 w-3.5" /> Sub-heading
        </span>
        <div className="flex items-center gap-1">
          {([2, 3] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onUpdate({ ...payload, level: l })}
              className={cn(
                'px-1.5 py-0.5 text-[9px] font-black uppercase rounded border',
                level === l ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-muted/30 hover:bg-muted/50 text-muted-foreground',
              )}
            >
              H{l}
            </button>
          ))}
          <button
            type="button"
            className="text-destructive hover:text-destructive/80 p-1 rounded focus:outline-none focus:ring-2 focus:ring-destructive/50 ml-1"
            onClick={onRemove}
            aria-label="Remove heading block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => onUpdate({ ...payload, text: e.target.value })}
        placeholder="Heading text..."
        className={cn('w-full bg-transparent border-b-2 border-border focus:outline-none focus:border-primary placeholder:text-muted-foreground', sizeClass)}
      />
    </div>
  );
}

function BlockCard({
  title,
  icon: Icon,
  onRemove,
  children,
}: Readonly<{
  title: string;
  icon: React.ElementType;
  onRemove: () => void;
  children: React.ReactNode;
}>) {
  return (
    <div className="border-2 border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <span className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" /> {title}
        </span>
        <button
          type="button"
          className="text-destructive hover:text-destructive/80 p-1 rounded"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function coerceImageLayout(raw: ImagePayload['layout']): ImageBlockLayout {
  if (raw === 'landscape' || raw === 'square' || raw === 'fullWidth') return raw;
  if (raw === 'natural' || raw === 'center') return 'landscape';
  return 'landscape';
}

type ImagePayloadWithLegacy = ImagePayload & { altText?: string };

function imageBlockCaption(p: ImagePayloadWithLegacy): string {
  const t = p.title?.trim();
  if (t) return t;
  return p.altText?.trim() ?? '';
}

function patchImagePayload(p: ImagePayloadWithLegacy, patch: Partial<ImagePayload>): ImagePayload {
  const { altText: _legacy, ...rest } = p;
  return { ...rest, ...patch };
}

const IMAGE_LAYOUT_OPTIONS: ReadonlyArray<{
  id: ImageBlockLayout;
  label: string;
  icon: typeof AlignLeft;
}> = [
  { id: 'landscape', label: 'Landscape', icon: AlignLeft },
  { id: 'square', label: 'Square', icon: Square },
  { id: 'fullWidth', label: 'Full width', icon: StretchHorizontal },
];

function ImageLayoutTitlePanel({
  layout,
  onLayout,
  title,
  onTitleChange,
  fieldId,
  titleInputSuffix = '',
  className,
}: Readonly<{
  layout: ImageBlockLayout;
  onLayout: (next: ImageBlockLayout) => void;
  title: string;
  onTitleChange: (value: string) => void;
  fieldId: string;
  titleInputSuffix?: string;
  className?: string;
}>) {
  const titleInputId = `${fieldId}-img-title${titleInputSuffix}`;
  return (
    <div className={cn('rounded-md border border-border bg-card/95 p-2 shadow-sm backdrop-blur-sm space-y-2', className)}>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Layout</p>
      <div className="flex gap-1">
        {IMAGE_LAYOUT_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => onLayout(id)}
            className={cn(
              'flex-1 rounded border px-1 py-1.5 transition-colors',
              layout === id ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-muted/80 text-muted-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5 mx-auto" strokeWidth={2} />
            <span className="text-[8px] font-bold block text-center mt-0.5 leading-tight">{label}</span>
          </button>
        ))}
      </div>
      <div className="space-y-1">
        <label htmlFor={titleInputId} className="text-[9px] font-bold text-muted-foreground uppercase">
          Title
        </label>
        <input
          id={titleInputId}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Optional — shown as caption; also used as image description for accessibility"
          className="w-full bg-background border border-border p-2 text-xs rounded focus:outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}

/** Unsplash selected image: credit bottom-right on image; layout + caption + remove on hover. */
function UnsplashImageWithOverlays({
  url,
  layout,
  photographer,
  caption,
  onLayout,
  onPhotographerChange,
  onCaptionChange,
  onRemove,
  fieldId,
  frameClassName,
  imgClassName,
}: Readonly<{
  url: string;
  layout: ImageBlockLayout;
  photographer: string;
  caption: string;
  onLayout: (next: ImageBlockLayout) => void;
  onPhotographerChange: (value: string) => void;
  onCaptionChange: (value: string) => void;
  onRemove: () => void;
  fieldId: string;
  frameClassName?: string;
  imgClassName: string;
}>) {
  const captionId = `${fieldId}-unsplash-caption`;
  const creditId = `${fieldId}-unsplash-credit`;
  const imgAlt = caption.trim() || photographer.trim() || 'Blog image';
  return (
    <div className={cn('group relative isolate h-full w-full overflow-hidden', frameClassName)}>
      <img src={url} alt={imgAlt} className={imgClassName} />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-linear-to-t from-black/85 via-black/35 to-transparent"
        aria-hidden
      />
      <div
        className={cn(
          'absolute inset-0 z-10 flex flex-col justify-between p-2 sm:p-3',
          'bg-linear-to-b from-black/65 via-black/20 to-black/50',
          'transition-all duration-200 ease-out',
          /* Touch / small: keep controls usable without hover */
          'max-md:pointer-events-auto max-md:opacity-100',
          'md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100',
          'focus-within:pointer-events-auto focus-within:opacity-100',
        )}
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div
            className="flex items-center gap-0.5 border-2 border-white/25 bg-black/55 px-1 py-1 shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] backdrop-blur-md"
            role="toolbar"
            aria-label="Image layout"
          >
            {IMAGE_LAYOUT_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={layout === id}
                onClick={(e) => {
                  e.stopPropagation();
                  onLayout(id);
                }}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center border border-transparent transition-all',
                  layout === id
                    ? 'border-white/40 bg-primary text-primary-foreground shadow-[2px_2px_0_0_rgba(255,255,255,0.25)]'
                    : 'text-white/90 hover:border-white/20 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-white/25 bg-black/55 text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:border-destructive hover:bg-destructive"
            aria-label="Remove image"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="pointer-events-auto w-full pb-10 sm:pb-11">
          <label htmlFor={captionId} className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
            <Type className="h-3 w-3 opacity-80" aria-hidden />
            Caption
          </label>
          <input
            id={captionId}
            type="text"
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Optional — shown under the image; used for accessibility"
            className="w-full border-2 border-white/25 bg-black/45 px-3 py-2 text-xs text-white placeholder:text-white/45 shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.2)] backdrop-blur-sm focus:border-primary focus:outline-none focus:ring-0"
          />
        </div>
      </div>
      {/* Author / credit — bottom-right on image */}
      <div className="absolute bottom-2 right-2 z-20 max-w-[min(88%,18rem)]">
        <label htmlFor={creditId} className="sr-only">
          Photo credit
        </label>
        <input
          id={creditId}
          type="text"
          value={photographer}
          onChange={(e) => onPhotographerChange(e.target.value)}
          placeholder="Photo by…"
          className="w-full min-w-0 border-2 border-white/25 bg-black/60 px-2.5 py-1.5 text-[10px] font-medium leading-snug text-white shadow-[3px_3px_0_0_rgba(0,0,0,0.35)] placeholder:text-white/45 backdrop-blur-md focus:border-primary focus:outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}

/** Uploaded image: same chrome as Unsplash (no photo credit); re-upload in the overlay toolbar. */
function UploadedImageWithOverlays({
  url,
  layout,
  caption,
  onLayout,
  onCaptionChange,
  onRemove,
  onReupload,
  fieldId,
  frameClassName,
  imgClassName,
}: Readonly<{
  url: string;
  layout: ImageBlockLayout;
  caption: string;
  onLayout: (next: ImageBlockLayout) => void;
  onCaptionChange: (value: string) => void;
  onRemove: () => void;
  onReupload: () => void;
  fieldId: string;
  frameClassName?: string;
  imgClassName: string;
}>) {
  const captionId = `${fieldId}-upload-caption`;
  const imgAlt = caption.trim() || 'Blog image';
  return (
    <div className={cn('group relative isolate h-full w-full overflow-hidden', frameClassName)}>
      <img src={url} alt={imgAlt} className={imgClassName} />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-linear-to-t from-black/85 via-black/35 to-transparent"
        aria-hidden
      />
      <div
        className={cn(
          'absolute inset-0 z-10 flex flex-col justify-between p-2 sm:p-3',
          'bg-linear-to-b from-black/65 via-black/20 to-black/50',
          'transition-all duration-200 ease-out',
          'max-md:pointer-events-auto max-md:opacity-100',
          'md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100',
          'focus-within:pointer-events-auto focus-within:opacity-100',
        )}
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div
            className="flex items-center gap-0.5 border-2 border-white/25 bg-black/55 px-1 py-1 shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] backdrop-blur-md"
            role="toolbar"
            aria-label="Image layout"
          >
            {IMAGE_LAYOUT_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={layout === id}
                onClick={(e) => {
                  e.stopPropagation();
                  onLayout(id);
                }}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center border border-transparent transition-all',
                  layout === id
                    ? 'border-white/40 bg-primary text-primary-foreground shadow-[2px_2px_0_0_rgba(255,255,255,0.25)]'
                    : 'text-white/90 hover:border-white/20 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReupload();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-white/25 bg-black/55 text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:border-primary hover:bg-primary/90"
            aria-label="Re-upload image"
            title="Re-upload"
          >
            <Upload className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-white/25 bg-black/55 text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.45)] backdrop-blur-md transition-colors hover:border-destructive hover:bg-destructive"
            aria-label="Remove image"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="pointer-events-auto w-full pb-4 sm:pb-5">
          <label htmlFor={captionId} className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
            <Type className="h-3 w-3 opacity-80" aria-hidden />
            Caption
          </label>
          <input
            id={captionId}
            type="text"
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Optional — shown under the image; used for accessibility"
            className="w-full border-2 border-white/25 bg-black/45 px-3 py-2 text-xs text-white placeholder:text-white/45 shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.2)] backdrop-blur-sm focus:border-primary focus:outline-none focus:ring-0"
          />
        </div>
      </div>
    </div>
  );
}

function ImageBlockEditor({
  blockId: _blockId,
  payload,
  token,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: ImagePayload;
  token: string | null;
  onUpdate: (p: ImagePayload) => void;
  onRemove: () => void;
}>) {
  const fieldId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const p = payload as ImagePayloadWithLegacy;
  const { url, layout: layoutRaw } = p;
  const layout = coerceImageLayout(layoutRaw);
  const caption = imageBlockCaption(p);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file || !token) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image (JPEG, PNG, GIF, WebP).');
        return;
      }
      if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
        toast.error(`Image must be under ${IMAGE_MAX_MB}MB.`);
        return;
      }
      setUploading(true);
      try {
        const data = await uploadMedia(token, file, undefined, () => {});
        if (data.url) onUpdate(patchImagePayload(p, { url: data.url }));
      } catch {
        toast.error('Upload failed.');
      } finally {
        setUploading(false);
      }
    },
    [token, p, onUpdate],
  );

  const renderSelectedUploadedImage = (imageUrl: string) => {
    const overlays = (
      <UploadedImageWithOverlays
        url={imageUrl}
        layout={layout}
        caption={caption}
        onLayout={(next) => onUpdate(patchImagePayload(p, { layout: next }))}
        onCaptionChange={(value) => onUpdate(patchImagePayload(p, { title: value }))}
        onRemove={onRemove}
        onReupload={() => inputRef.current?.click()}
        fieldId={fieldId}
        imgClassName="h-full w-full object-cover object-center"
      />
    );
    if (layout === 'square') {
      return (
        <div className="border-2 border-border bg-muted/50 p-2 sm:p-3 shadow-md">
          <div className="mx-auto aspect-square w-full max-w-xl overflow-hidden border-2 border-border bg-background">
            {overlays}
          </div>
        </div>
      );
    }
    if (layout === 'fullWidth') {
      return (
        <div className="min-w-0 w-full overflow-hidden border-2 border-border bg-muted/50 shadow-md">
          <div className="relative h-80 w-full min-w-0 sm:h-88 lg:h-104">{overlays}</div>
        </div>
      );
    }
    return (
      <div className="border-2 border-border bg-muted/50 p-2 sm:p-3 shadow-md">
        <div className="mx-auto aspect-video w-full max-w-3xl overflow-hidden border-2 border-border bg-background">
          {overlays}
        </div>
      </div>
    );
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={IMAGE_ACCEPT}
      className="hidden"
      onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
    />
  );

  if (url) {
    return (
      <>
        {fileInput}
        <div className="relative w-full">{renderSelectedUploadedImage(url)}</div>
      </>
    );
  }

  return (
    <BlockCard title="Image" icon={ImageIcon} onRemove={onRemove}>
      {fileInput}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'w-full border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer',
          'hover:bg-muted/20 transition-colors',
          uploading && 'pointer-events-none opacity-70',
        )}
      >
        {uploading ? (
          <span className="text-[11px] text-muted-foreground">Uploading…</span>
        ) : (
          <>
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <span className="text-[11px] font-bold text-muted-foreground">Upload image</span>
          </>
        )}
      </button>
    </BlockCard>
  );
}

function videoSlotsFromPayload(payload: VideoEmbedPayload): string[] {
  const v = (payload.videos ?? []).filter((s) => typeof s === 'string' && s.trim()).slice(0, VIDEO_EMBED_MAX);
  if (v.length > 0) return v.map((s) => s.trim());
  const u = payload.url?.trim(); // NOSONAR
  return u ? [u] : [''];
}

function normalizeSlotsToVideos(slots: string[]): string[] {
  const out: string[] = [];
  for (const s of slots) {
    const t = s.trim();
    if (!t) continue;
    const r = normalizeVideoEmbedUrl(t);
    if (r.embedUrl) out.push(r.embedUrl);
  }
  return out.slice(0, VIDEO_EMBED_MAX);
}

/** Row: 3 → small only; 2 → no large. Column: S / M / L always allowed. */
function clampVideoEmbedSize(
  videoCount: number,
  s: VideoEmbedDisplaySize,
  layout: VideoEmbedLayoutDirection,
): VideoEmbedDisplaySize {
  if (layout === 'column') return s;
  if (videoCount >= 3) return 'sm';
  if (videoCount === 2) return s === 'lg' ? 'md' : s;
  return s;
}

function VideoEmbedPreviewThumb({
  embedUrl,
  size,
}: Readonly<{ embedUrl: string; size: VideoEmbedDisplaySize }>) {
  const thumb = youtubeThumbnailUrl(embedUrl);
  let widthClass: string;
  if (size === 'sm') {
    widthClass = 'w-[min(100%,7.75rem)] sm:w-[7.75rem]';
  } else if (size === 'md') {
    widthClass = 'w-[min(100%,11.5rem)] sm:w-[11.5rem]';
  } else {
    widthClass = 'w-full max-w-lg';
  }
  let filmIcon: string;
  if (size === 'sm') {
    filmIcon = 'h-5 w-5';
  } else if (size === 'md') {
    filmIcon = 'h-6 w-6';
  } else {
    filmIcon = 'h-8 w-8';
  }
  if (thumb) {
    return (
      <div
        className={cn(
          'shrink-0 overflow-hidden border-2 border-border bg-black shadow ring-1 ring-black/20',
          widthClass,
        )}
      >
        <div className="relative aspect-video w-full">
          <img src={thumb} alt="" className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-linear-to-t from-black/50 to-transparent">
            <div className="flex h-9 w-9 items-center justify-center border-2 border-white/30 bg-black/55 shadow-md backdrop-blur-[2px]">
              <Film className={cn('text-white', filmIcon)} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  let iframeH: string;
  if (size === 'sm') {
    iframeH = 'h-[4.5rem]';
  } else if (size === 'md') {
    iframeH = 'h-[6.75rem]';
  } else {
    iframeH = 'h-40';
  }
  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden border-2 border-border bg-black shadow',
        widthClass,
      )}
    >
      <iframe
        src={embedUrl}
        title="Video preview"
        className={cn('w-full border-0', iframeH)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

function VideoEmbedBlockEditor({
  blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: VideoEmbedPayload;
  onUpdate: (p: VideoEmbedPayload) => void;
  onRemove: () => void;
}>) {
  const fieldId = useId();
  const layout: VideoEmbedLayoutDirection = payload.layout === 'column' ? 'column' : 'row';
  const size: VideoEmbedDisplaySize = payload.size === 'sm' || payload.size === 'lg' ? payload.size : 'md';

  const [slots, setSlots] = useState<string[]>(() => videoSlotsFromPayload(payload));
  const [slotErrors, setSlotErrors] = useState<(string | undefined)[]>([]);

  const commitAll = useCallback(
    (nextSlots: string[], nextLayout: VideoEmbedLayoutDirection, nextSize: VideoEmbedDisplaySize) => {
      const videos = normalizeSlotsToVideos(nextSlots);
      const layoutOut: VideoEmbedLayoutDirection = videos.length < 2 ? 'row' : nextLayout;
      const clampedSize = clampVideoEmbedSize(videos.length, nextSize, layoutOut);
      onUpdate({
        videos,
        layout: layoutOut,
        size: clampedSize,
        url: videos[0],
      });
    },
    [onUpdate],
  );

  const handleSlotBlur = (index: number) => {
    const raw = slots[index]?.trim() ?? '';
    if (!raw) {
      const cleared = [...slots];
      cleared[index] = '';
      setSlotErrors((prev) => {
        const next = [...prev];
        next[index] = undefined;
        return next;
      });
      setSlots(cleared);
      commitAll(cleared, layout, size);
      return;
    }
    const r = normalizeVideoEmbedUrl(raw);
    if (r.error) {
      setSlotErrors((prev) => {
        const next = [...prev];
        next[index] = r.error;
        return next;
      });
      return;
    }
    if (r.watchLinkNote) {
      toast.message(r.watchLinkNote);
    }
    const nextSlots = [...slots];
    nextSlots[index] = r.embedUrl ?? raw;
    const videos = normalizeSlotsToVideos(nextSlots);
    const lastEmpty = nextSlots.length > 0 && nextSlots.at(-1)?.trim() === '';
    let finalSlots = nextSlots;
    if (videos.length < VIDEO_EMBED_MAX && !lastEmpty) {
      finalSlots = [...nextSlots, ''];
    }
    setSlots(finalSlots);
    setSlotErrors((prev) => {
      const n = [...prev];
      n[index] = undefined;
      return n;
    });
    commitAll(finalSlots, layout, size);
  };

  const previews = useMemo(() => {
    const list: string[] = [];
    for (const s of slots) {
      const t = s.trim();
      if (!t) continue;
      const r = normalizeVideoEmbedUrl(t);
      if (r.embedUrl) list.push(r.embedUrl);
    }
    return list;
  }, [slots]);

  const previewCount = previews.length;
  const effectiveLayout: VideoEmbedLayoutDirection = previewCount < 2 ? 'row' : layout;
  const displaySize = useMemo(
    () => clampVideoEmbedSize(previewCount, size, effectiveLayout),
    [previewCount, size, effectiveLayout],
  );

  const sizeOptionDisabled = (id: VideoEmbedDisplaySize): boolean => {
    if (effectiveLayout === 'column') return false;
    if (previewCount >= 3) return id !== 'sm';
    if (previewCount === 2) return id === 'lg';
    return false;
  };

  let sizeHint: string | null;
  if (effectiveLayout === 'row' && previewCount >= 3) {
    sizeHint = 'Row + three videos: small previews only.';
  } else if (effectiveLayout === 'row' && previewCount === 2) {
    sizeHint = 'Row + two videos: large size is unavailable.';
  } else {
    sizeHint = null;
  }

  const showColumnLayout = previewCount >= 2;
  const showAddVideoButton = previewCount >= 2 && slots.length < VIDEO_EMBED_MAX;

  const addSlot = () => {
    if (slots.length >= VIDEO_EMBED_MAX) return;
    setSlots((prev) => [...prev, '']);
  };

  const removeSlotAt = (i: number) => {
    if (slots.length <= 1) {
      setSlots(['']);
      commitAll([''], layout, size);
      return;
    }
    const next = slots.filter((_, j) => j !== i);
    setSlots(next);
    commitAll(next, layout, size);
  };

  return (
    <BlockCard title="Video embed" icon={Film} onRemove={onRemove}>
      <div className="space-y-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Add up to three links. YouTube watch URLs become embeds. Missing{' '}
          <code className="border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">?v=</code> shows an error
          until fixed.
        </p>

        <div className="border-2 border-border bg-muted/25 p-3 shadow-md">
          <div className={cn('grid gap-4', showColumnLayout ? 'sm:grid-cols-2' : 'grid-cols-1')}>
            <div className="space-y-2">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Layout</span>
              {showColumnLayout ? (
                <div
                  className="flex overflow-hidden border-2 border-border bg-card shadow-sm"
                >
                  <button
                    type="button"
                    title="Side by side"
                    aria-pressed={layout === 'row'}
                    onClick={() => commitAll(slots, 'row', size)}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors',
                      layout === 'row'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                    )}
                  >
                    <StretchHorizontal className="h-4 w-4" strokeWidth={2} />
                    Row
                  </button>
                  <span className="w-px shrink-0 bg-border" aria-hidden />
                  <button
                    type="button"
                    title="Stacked"
                    aria-pressed={layout === 'column'}
                    onClick={() => commitAll(slots, 'column', size)}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-bold uppercase tracking-wide transition-colors',
                      layout === 'column'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                    )}
                  >
                    <StretchVertical className="h-4 w-4" strokeWidth={2} />
                    Column
                  </button>
                </div>
              ) : (
                <div
                  className="flex border-2 border-border bg-card shadow-sm"
                >
                  <div className="flex w-full flex-col items-center gap-1 bg-primary py-2.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                    <StretchHorizontal className="h-4 w-4" strokeWidth={2} />
                    Row
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Preview size
              </span>
              <div
                className="flex overflow-hidden border-2 border-border bg-card shadow-sm"
              >
                {(
                  [
                    { id: 'sm' as const, label: 'S' },
                    { id: 'md' as const, label: 'M' },
                    { id: 'lg' as const, label: 'L' },
                  ] as const
                ).map(({ id, label }, idx) => {
                  return (
                    <React.Fragment key={id}>
                    {idx > 0 ? <span className="w-px shrink-0 bg-border" aria-hidden /> : null}
                    <button
                      type="button"
                      aria-pressed={displaySize === id}
                      disabled={sizeOptionDisabled(id)}
                      title={(() => {
                        let titleText: string | undefined;
                        if (sizeOptionDisabled(id)) {
                          if (previewCount >= 3) {
                            titleText = 'Unavailable with three videos';
                          } else {
                            titleText = 'Unavailable with two videos';
                          }
                        }
                        return titleText;
                      })()}
                      onClick={() => {
                        if (sizeOptionDisabled(id)) return;
                        commitAll(slots, layout, id);
                      }}
                      className={cn(
                        'min-w-0 flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors',
                        displaySize === id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                        sizeOptionDisabled(id) &&
                          'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground',
                      )}
                    >
                      {label}
                    </button>
                    </React.Fragment>
                  );
                })}
              </div>
              {sizeHint ? <p className="text-[10px] leading-snug text-muted-foreground">{sizeHint}</p> : null}
            </div>
          </div>
        </div>
        <div className="space-y-2.5">
          {slots.map((val, i) => (
            <div key={`${fieldId}-slot-${i}`} className="space-y-1">
              <div className="flex gap-2 items-start">
                <label htmlFor={`${fieldId}-v-${i}`} className="sr-only">
                  Video URL {i + 1}
                </label>
                <div className="relative min-w-0 flex-1">
                  <span
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground tabular-nums"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <input
                    id={`${fieldId}-v-${i}`}
                    type="url"
                    inputMode="url"
                    value={val}
                    onChange={(e) => {
                      const next = [...slots];
                      next[i] = e.target.value;
                      setSlots(next);
                    }}
                    onBlur={() => handleSlotBlur(i)}
                    placeholder="Paste video or embed URL…"
                    className="w-full border-2 border-border bg-background py-2.5 pl-8 pr-3 text-xs shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.04)] focus:border-primary focus:outline-none focus:ring-0 font-mono"
                  />
                </div>
                {slots.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeSlotAt(i)}
                    className="shrink-0 border-2 border-border bg-muted/50 p-2.5 text-muted-foreground shadow-sm transition-colors hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove video ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              {slotErrors[i] ? <p className="text-[10px] text-destructive leading-snug">{slotErrors[i]}</p> : null}
            </div>
          ))}
        </div>

        {showAddVideoButton ? (
          <button
            type="button"
            onClick={addSlot}
            className="inline-flex items-center gap-2 border-2 border-dashed border-border bg-muted/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary/5"
          >
            <Film className="h-3.5 w-3.5" />
            Add video ({slots.length}/{VIDEO_EMBED_MAX})
          </button>
        ) : null}

        {previews.length > 0 ? (
          <div className="space-y-2">
            <span className="block text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Preview
            </span>
            <div
              className={cn(
                'flex min-h-20 gap-3 border-2 border-border bg-linear-to-b from-muted/50 to-muted/20 p-4 shadow-md',
                effectiveLayout === 'row'
                  ? 'flex-row flex-wrap items-start justify-center content-center'
                  : 'flex-col items-center justify-center',
              )}
            >
              {previews.map((embedUrl, pi) => (
                <VideoEmbedPreviewThumb key={`${embedUrl}-${pi}`} embedUrl={embedUrl} size={displaySize} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </BlockCard>
  );
}

export type GithubRepoPayload = {
  owner?: string;
  repo?: string;
  url?: string;
  description?: string;
  avatarUrl?: string;
  name?: string;
};

function GithubRepoBlockEditor({
  blockId: _blockId,
  payload,
  onUpdate,
  onRemove,
  token,
  hasGithubLinked,
}: Readonly<{
  blockId: string;
  payload: GithubRepoPayload;
  onUpdate: (p: GithubRepoPayload) => void;
  onRemove: () => void;
  token: string | null;
  hasGithubLinked?: boolean;
}>) {
  const { owner = '', repo = '', url = '', description = '', avatarUrl = '', name: repoName = '' } = payload;
  const displayUrl = url || (owner && repo ? `https://github.com/${owner}/${repo}` : '');
  const isSelected = !!(displayUrl || (owner && repo));

  const [urlInput, setUrlInput] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [myRepos, setMyRepos] = useState<GithubRepoListItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const handleFetchByUrl = useCallback(async () => {
    const toFetch = urlInput.trim();
    if (!toFetch) return;
    if (!parseGithubRepoUrl(toFetch)) {
      setFetchError('Enter a valid GitHub repo URL (e.g. https://github.com/owner/repo)');
      return;
    }
    setFetching(true);
    setFetchError(null);
    try {
      const info = await fetchRepoByUrl(toFetch);
      onUpdate({
        owner: info.owner,
        repo: info.name,
        url: info.html_url,
        description: info.description,
        avatarUrl: info.avatar_url ?? '',
        name: info.name,
      });
      setUrlInput('');
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to fetch repo');
    } finally {
      setFetching(false);
    }
  }, [urlInput, onUpdate]);

  const loadMyRepos = useCallback(async () => {
    if (!token || !hasGithubLinked) return;
    setLoadingRepos(true);
    try {
      const repos = await fetchMyRepos(token);
      setMyRepos(repos);
    } catch {
      setMyRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  }, [token, hasGithubLinked]);

  const selectRepo = useCallback(
    (r: GithubRepoListItem) => {
      onUpdate({
        owner: r.owner?.login ?? '',
        repo: r.name,
        url: r.html_url,
        description: r.description ?? '',
        avatarUrl: r.owner?.avatar_url ?? '',
        name: r.name,
      });
      setMyRepos([]);
    },
    [onUpdate],
  );

  // Selected: show only the GitHub card (avatar, repo name, owner, description, link)
  if (isSelected) {
    const title = repoName || repo || 'Repository';
    const by = owner || 'GitHub';
    return (
      <div className="relative group w-full rounded-lg border-2 border-border bg-card overflow-hidden">
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 pr-14 hover:bg-muted/30 transition-colors"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full border border-border object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full border-2 border-border bg-muted flex items-center justify-center">
              <GithubIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{title}</p>
            <p className="text-[11px] text-muted-foreground truncate">{by}</p>
            {description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{description}</p>}
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
        </a>
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded border border-border bg-card text-destructive hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Remove repo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Picker: URL input + optional "Your repos"
  return (
    <BlockCard title="GitHub repo" icon={GithubIcon} onRemove={onRemove}>
      <div className="space-y-3">
        <div>
          <label htmlFor="github-repo-url-input" className="text-[9px] font-bold text-muted-foreground uppercase">
            Repo URL
          </label>
          <div className="flex gap-2 mt-1">
            <input
              id="github-repo-url-input"
              type="url"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setFetchError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchByUrl()}
              placeholder="https://github.com/owner/repo"
              className="flex-1 bg-background border border-border p-2 text-xs rounded focus:outline-none focus:border-primary font-mono"
            />
            <button
              type="button"
              onClick={handleFetchByUrl}
              disabled={fetching || !urlInput.trim()}
              className="px-3 py-1.5 text-[10px] font-bold uppercase rounded border-2 border-border bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {fetching ? '…' : 'Fetch'}
            </button>
          </div>
          {fetchError && <p className="text-[10px] text-destructive mt-1">{fetchError}</p>}
        </div>

        {hasGithubLinked && token && (
          <>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Or</p>
            <div>
              <button
                type="button"
                onClick={loadMyRepos}
                disabled={loadingRepos}
                className="px-3 py-1.5 text-[10px] font-bold uppercase rounded border-2 border-border bg-muted hover:bg-muted/80 disabled:opacity-50"
              >
                {loadingRepos ? 'Loading…' : 'Your repos'}
              </button>
              {myRepos.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded border border-border p-1.5 bg-muted/20 space-y-1">
                  {myRepos.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => selectRepo(r)}
                      className="w-full flex items-center gap-2 p-2 rounded border border-transparent hover:border-primary hover:bg-muted/50 text-left"
                    >
                      {r.owner?.avatar_url ? (
                        <img src={r.owner.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <GithubIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs font-mono truncate flex-1">{r.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </BlockCard>
  );
}

function UnsplashBlockEditor({
  blockId,
  payload,
  onUpdate,
  onRemove,
}: Readonly<{
  blockId: string;
  payload: { url?: string; photographer?: string; caption?: string; layout?: ImageBlockLayout };
  onUpdate: (p: { url?: string; photographer?: string; caption?: string; layout?: ImageBlockLayout }) => void;
  onRemove: () => void;
}>) {
  const { url = '', photographer = '', layout: layoutRaw } = payload;
  const layout: ImageBlockLayout = layoutRaw === 'square' || layoutRaw === 'fullWidth' ? layoutRaw : 'landscape';
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UnsplashPhoto[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const hasUnsplashKey = !!process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await searchUnsplashPhotos(searchQuery, { per_page: 20 });
      setResults(res.results ?? []);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const selectPhoto = useCallback(
    (photo: UnsplashPhoto) => {
      const imageUrl = photo.urls?.regular || photo.urls?.full || photo.urls?.small || '';
      const credit = photo.user?.name ? `Photo by ${photo.user.name} on Unsplash` : '';
      if (imageUrl) onUpdate({ url: imageUrl, photographer: photographer || credit, layout: layout });
      setResults([]);
      setSearchQuery('');
    },
    [onUpdate, photographer, layout],
  );

  const renderSelectedImage = () => {
    const overlays = (
      <UnsplashImageWithOverlays
        url={url}
        layout={layout}
        photographer={photographer}
        caption={payload.caption ?? ''}
        onLayout={(next) => onUpdate({ ...payload, layout: next })}
        onPhotographerChange={(value) => onUpdate({ ...payload, photographer: value })}
        onCaptionChange={(value) => onUpdate({ ...payload, caption: value })}
        onRemove={onRemove}
        fieldId={blockId}
        imgClassName="h-full w-full object-cover object-center"
      />
    );
    if (layout === 'square') {
      return (
        <div className="border-2 border-border bg-muted/50 p-2 sm:p-3 shadow-md">
          <div className="mx-auto aspect-square w-full max-w-xl overflow-hidden border-2 border-border bg-background">
            {overlays}
          </div>
        </div>
      );
    }
    if (layout === 'fullWidth') {
      return (
        <div className="min-w-0 w-full overflow-hidden border-2 border-border bg-muted/50 shadow-md">
          <div className="relative h-80 w-full min-w-0 sm:h-88 lg:h-104">{overlays}</div>
        </div>
      );
    }
    return (
      <div className="border-2 border-border bg-muted/50 p-2 sm:p-3 shadow-md">
        <div className="mx-auto aspect-video w-full max-w-3xl overflow-hidden border-2 border-border bg-background">
          {overlays}
        </div>
      </div>
    );
  };

  // Image selected: controls + credit on image (hover for layout & caption)
  if (url) {
    return <div className="relative w-full">{renderSelectedImage()}</div>;
  }

  // No image yet: show Unsplash search block
  return (
    <BlockCard title="Unsplash" icon={Camera} onRemove={onRemove}>
      <div className="space-y-3">
        {hasUnsplashKey ? (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search photos..."
                className="flex-1 border-2 border-border bg-background p-2 text-xs focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-3 py-1.5 text-[10px] font-bold uppercase border-2 border-border bg-primary text-primary-foreground shadow hover:brightness-110 disabled:opacity-50"
              >
                {searching ? '…' : 'Search'}
              </button>
            </div>
            {searchError && (
              <p className="text-[10px] text-destructive">{searchError}</p>
            )}
            {results.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto border-2 border-border p-1.5 bg-muted/20">
                {results.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => selectPhoto(photo)}
                    onKeyDown={(e) => e.key === 'Enter' && selectPhoto(photo)}
                    className="aspect-square overflow-hidden border-2 border-border hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <img
                      src={photo.urls?.small ?? photo.urls?.thumb}
                      alt={photo.alt_description ?? 'Unsplash'}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Add <code className="border border-border bg-muted px-1">NEXT_PUBLIC_UNSPLASH_ACCESS_KEY</code> to .env.local to search photos.
          </p>
        )}
      </div>
    </BlockCard>
  );
}

export interface BlogWriteEditorProps {
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
  token: string | null;
  currentUserUsername?: string;
  currentUserHasGithub?: boolean;
  isSidebarOpen: boolean;
  maxWidthClassName?: string;
  activeSectionId: string;
}

export function BlogWriteEditor({
  blocks,
  onBlocksChange,
  token,
  currentUserUsername,
  currentUserHasGithub,
  isSidebarOpen,
  maxWidthClassName = 'max-w-3xl',
  activeSectionId,
}: Readonly<BlogWriteEditorProps>) {
  const updateBlock = useCallback(
    (id: string, payload: any) => {
      onBlocksChange(
        blocks.map((b) => (b.id === id ? { ...b, payload } : b)),
      );
    },
    [blocks, onBlocksChange],
  );

  const removeBlock = useCallback(
    (id: string) => {
      const next = blocks.filter((b) => b.id !== id);
      onBlocksChange(next);
    },
    [blocks, onBlocksChange],
  );

  const visibleBlocks = blocks.filter(
    (b) => (b.sectionId ?? activeSectionId) === activeSectionId,
  );

  /** Global index to insert *before* (equals `blocks.length` to append after last block in doc). */
  const appendSlotIndex = useMemo(() => {
    if (visibleBlocks.length === 0) return blocks.length;
    const last = visibleBlocks.at(-1)!;
    const lastGlobal = blocks.findIndex((b) => b.id === last.id);
    return lastGlobal >= 0 ? lastGlobal + 1 : blocks.length;
  }, [visibleBlocks, blocks]);

  const moveBlock = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex < 0 || fromIndex >= blocks.length) return;
      if (toIndex < 0 || toIndex > blocks.length) return;
      if (fromIndex === toIndex) return;
      const reordered = [...blocks];
      const [removed] = reordered.splice(fromIndex, 1);
      let insertAt = toIndex;
      if (fromIndex < toIndex) insertAt -= 1;
      insertAt = Math.max(0, Math.min(insertAt, reordered.length));
      reordered.splice(insertAt, 0, removed);
      onBlocksChange(reordered);
    },
    [blocks, onBlocksChange],
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const dropTargetIndexRef = useRef<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
    setDropTargetIndex(null);
    dropTargetIndexRef.current = null;
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
    dropTargetIndexRef.current = null;
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, overIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (draggedIndex === null) return;
      if (overIndex === draggedIndex) return;
      dropTargetIndexRef.current = overIndex;
      setDropTargetIndex(overIndex);
    },
    [draggedIndex],
  );

  const handleDragOverAppendZone = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (draggedIndex === null) return;
      dropTargetIndexRef.current = appendSlotIndex;
      setDropTargetIndex(appendSlotIndex);
    },
    [draggedIndex, appendSlotIndex],
  );

  const handleDropOnRow = useCallback(
    (e: React.DragEvent, rowInsertBeforeIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      const fromIndex = Number.parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (Number.isNaN(fromIndex)) return;
      const toIndex = dropTargetIndexRef.current ?? rowInsertBeforeIndex;
      dropTargetIndexRef.current = null;
      setDraggedIndex(null);
      setDropTargetIndex(null);
      moveBlock(fromIndex, toIndex);
    },
    [moveBlock],
  );

  const handleDropOnAppendZone = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const fromIndex = Number.parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (Number.isNaN(fromIndex)) return;
      dropTargetIndexRef.current = null;
      setDraggedIndex(null);
      setDropTargetIndex(null);
      moveBlock(fromIndex, appendSlotIndex);
    },
    [moveBlock, appendSlotIndex],
  );

  const blockListDropRef = useRef<HTMLDivElement>(null);

  if (visibleBlocks.length === 0) {
    return (
      <div className="pb-16 flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border rounded-lg bg-muted/20">
        <p className="text-sm font-medium text-muted-foreground text-center">
          Please insert a block from the left panel.
        </p>
        <p className="text-xs text-muted-foreground mt-1 text-center">
          Use the Tools section to add paragraphs, images, embeds, and more.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={blockListDropRef}
      className="pb-16 selection:bg-primary selection:text-primary-foreground"
    >
      <ul className="mb-6 list-none space-y-4 p-0">
        {visibleBlocks.map((block) => {
          const blockIndex = blocks.findIndex((b) => b.id === block.id);
          const isDragging = draggedIndex === blockIndex;
          const isDropTarget = dropTargetIndex === blockIndex && !isDragging;
          let blockContent: React.ReactNode;
          if (block.type === 'paragraph') {
            blockContent = (
              <ParagraphBlockEditor
                blockId={block.id}
                payload={block.payload ?? { text: '' }}
                onUpdate={(p) => updateBlock(block.id, p)}
                onRemove={() => removeBlock(block.id)}
              />
            );
          } else if (block.type === 'heading') {
            blockContent = (
              <HeadingBlockEditor
                blockId={block.id}
                payload={{ text: block.payload?.text ?? '', level: block.payload?.level ?? 2 }}
                onUpdate={(p) => updateBlock(block.id, p)}
                onRemove={() => removeBlock(block.id)}
              />
            );
          } else if (block.type === 'partition') {
            blockContent = (
              <div className="group flex items-center gap-2 py-2">
                <div className="flex-1 border-t border-dashed border-border" />
                <button
                  type="button"
                  className="text-destructive hover:text-destructive/80 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeBlock(block.id)}
                  aria-label="Remove divider"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          } else if (block.type === 'image') {
            blockContent = (
              <ImageBlockEditor
                blockId={block.id}
                payload={block.payload ?? {}}
                token={token}
                onUpdate={(payload) => updateBlock(block.id, payload)}
                onRemove={() => removeBlock(block.id)}
              />
            );
          } else if (block.type === 'videoEmbed') {
            blockContent = (
              <VideoEmbedBlockEditor
                blockId={block.id}
                payload={block.payload ?? {}}
                onUpdate={(payload) => updateBlock(block.id, payload)}
                onRemove={() => removeBlock(block.id)}
              />
            );
          } else if (block.type === 'githubRepo') {
            blockContent = (
              <GithubRepoBlockEditor
                blockId={block.id}
                payload={block.payload ?? {}}
                onUpdate={(payload) => updateBlock(block.id, payload)}
                onRemove={() => removeBlock(block.id)}
                token={token}
                hasGithubLinked={currentUserHasGithub}
              />
            );
          } else if (block.type === 'unsplashImage') {
            blockContent = (
              <UnsplashBlockEditor
                blockId={block.id}
                payload={block.payload ?? {}}
                onUpdate={(payload) => updateBlock(block.id, payload)}
                onRemove={() => removeBlock(block.id)}
              />
            );
          } else {
            blockContent = (
              <div className="border border-dashed border-border bg-card p-3 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Block: {block.type}</span>
                <button
                  type="button"
                  className="text-destructive hover:text-destructive/80 p-1 rounded focus:outline-none focus:ring-2 focus:ring-destructive/50"
                  onClick={() => removeBlock(block.id)}
                  aria-label="Remove block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          }
          return (
            <li
              key={block.id}
              onDragOver={(e) => handleDragOver(e, blockIndex)}
              onDrop={(e) => handleDropOnRow(e, blockIndex)}
              className={cn(
                'relative list-none flex items-start gap-2 group/drag rounded-md transition-all duration-150',
                isDragging && 'opacity-50',
              )}
            >
              {isDropTarget && (
                <div
                  className="absolute left-0 right-0 -top-2 z-10 h-0.5 rounded-full bg-primary pointer-events-none"
                  aria-hidden
                />
              )}
              <button
                type="button"
                draggable
                onDragStart={(e) => handleDragStart(e, blockIndex)}
                onDragEnd={handleDragEnd}
                className="mt-2 shrink-0 p-1 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/50 touch-none select-none"
                aria-label="Drag to reorder"
                title="Drag to reorder"
              >
                <GripVertical className="h-4 w-4 pointer-events-none" />
              </button>
              <div className="flex-1 min-w-0" draggable={false}>
                {blockContent}
              </div>
            </li>
          );
        })}
      </ul>
      <div
        className={cn(
          'min-h-14 rounded-md border-2 border-dashed transition-colors',
          dropTargetIndex === appendSlotIndex ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border/70',
        )}
        onDragOver={handleDragOverAppendZone}
        onDrop={handleDropOnAppendZone}
      >
        <p className="pointer-events-none py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Drop here to place at end of section
        </p>
      </div>
    </div>
  );
}

