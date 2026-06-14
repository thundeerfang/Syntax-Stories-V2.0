"use client";
import { useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/core/utils";
const CROP_AREA_SELECTOR = '[data-testid="cropper"]';
function focusCropArea(container: HTMLElement | null) {
  container
    ?.querySelector<HTMLElement>(CROP_AREA_SELECTOR)
    ?.focus({ preventScroll: true });
}
type CropperKeyboardWrapperProps = {
  imageReady: boolean;
  className?: string;
  children: ReactNode;
  autoFocusOnImageReady?: boolean;
};
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
        "relative outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background",
        className,
      )}
      onPointerDownCapture={() => focusCropArea(ref.current)}
    >
      {children}
    </div>
  );
}
