'use client';

import { useRef, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Matches react-easy-crop's focusable crop frame (`data-testid="cropper"`). */
const CROP_AREA_SELECTOR = '[data-testid="cropper"]';

function focusCropArea(container: HTMLElement | null) {
  container?.querySelector<HTMLElement>(CROP_AREA_SELECTOR)?.focus({ preventScroll: true });
}

type CropperKeyboardWrapperProps = {
  /** When true, focus the crop frame after layout (e.g. after image is selected). */
  imageReady: boolean;
  className?: string;
  children: ReactNode;
  /** Focus crop region when image becomes ready (default true). */
  autoFocusOnImageReady?: boolean;
};

/**
 * Layout shell around `react-easy-crop`. Keyboard panning is handled by the library on the crop
 * frame (with `restrictPosition`); we only move focus to that node so arrows never bypass limits.
 */
export function CropperKeyboardWrapper({
  imageReady,
  className,
  children,
  autoFocusOnImageReady = true,
}: Readonly<CropperKeyboardWrapperProps>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imageReady || !autoFocusOnImageReady) return;
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (!cancelled) focusCropArea(ref.current);
    });
    const t = globalThis.setTimeout(() => {
      if (!cancelled) focusCropArea(ref.current);
    }, 120);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      globalThis.clearTimeout(t);
    };
  }, [imageReady, autoFocusOnImageReady]);

  return (
    <div
      ref={ref}
      className={cn(
        'relative outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background',
        className
      )}
      onPointerDownCapture={() => focusCropArea(ref.current)}
    >
      {children}
    </div>
  );
}
