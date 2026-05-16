'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

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
