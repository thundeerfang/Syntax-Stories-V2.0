'use client';

import { useRef, useEffect, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { cn } from '@/lib/utils';
import { handleCropperArrowKeys, type CropPercent } from '@/lib/cropperKeyboard';

type CropperKeyboardWrapperProps = {
  /** When true, focus the region on next frame (e.g. after image is selected). */
  imageReady: boolean;
  setCrop: Dispatch<SetStateAction<CropPercent>>;
  className?: string;
  children: ReactNode;
  /** Focus wrapper when image becomes ready (default true). */
  autoFocusOnImageReady?: boolean;
};

/**
 * Focusable region around `react-easy-crop` so Arrow keys move the image; Shift+Arrow = larger step.
 * Clicking/dragging inside focuses the region for subsequent keyboard use.
 */
export function CropperKeyboardWrapper({
  imageReady,
  setCrop,
  className,
  children,
  autoFocusOnImageReady = true,
}: Readonly<CropperKeyboardWrapperProps>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imageReady || !autoFocusOnImageReady) return;
    const id = requestAnimationFrame(() => {
      ref.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [imageReady, autoFocusOnImageReady]);

  // NOSONAR S6845,S6847 — focusable crop region; role=application + keyboard/pointer handlers for react-easy-crop
  return (
    <div
      ref={ref}
      tabIndex={0}
      role="application"
      aria-label="Image crop. Arrow keys move the image behind the frame. Shift plus arrow for larger steps."
      className={cn(
        'relative outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
      onKeyDown={(e) => handleCropperArrowKeys(e, setCrop)}
      onPointerDownCapture={() => ref.current?.focus({ preventScroll: true })}
    >
      {children}
    </div>
  );
}
