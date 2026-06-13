'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/core/utils';

/** Above dialog panels (z-[100]). */
export const DROPDOWN_PORTAL_Z = 160;

export type DropdownPortalLayout = Readonly<{
  top: number;
  left: number;
  width: number;
  scrollableMax: number;
}>;

function useDropdownPortalLayout({
  open,
  triggerRef,
  minWidth = 200,
  gap = 4,
  maxHeight = 220,
  reservedBottom = 0,
  deps = [],
}: Readonly<{
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  minWidth?: number;
  gap?: number;
  maxHeight?: number;
  reservedBottom?: number;
  deps?: ReadonlyArray<unknown>;
}>): DropdownPortalLayout {
  const [layout, setLayout] = React.useState<DropdownPortalLayout>({
    top: 0,
    left: 0,
    width: minWidth,
    scrollableMax: maxHeight,
  });

  const updateLayout = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || !open) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, minWidth);
    const top = rect.bottom + gap;
    const margin = 8;
    const scrollableMax = Math.min(
      maxHeight,
      Math.max(80, globalThis.innerHeight - top - margin - reservedBottom)
    );
    setLayout({ top, left: rect.left, width, scrollableMax });
  }, [open, triggerRef, minWidth, gap, maxHeight, reservedBottom]);

  React.useLayoutEffect(() => {
    updateLayout();
  }, [updateLayout, open, ...deps]);

  React.useEffect(() => {
    if (!open) return;
    const onResize = () => updateLayout();
    globalThis.addEventListener('resize', onResize);
    return () => globalThis.removeEventListener('resize', onResize);
  }, [open, updateLayout]);

  return layout;
}

export type DropdownPortalProps = Readonly<{
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode | ((layout: DropdownPortalLayout) => React.ReactNode);
  className?: string;
  minWidth?: number;
  gap?: number;
  maxHeight?: number;
  reservedBottom?: number;
  role?: string;
  layoutDeps?: ReadonlyArray<unknown>;
}>;

export function DropdownPortal({
  open,
  triggerRef,
  contentRef,
  children,
  className,
  minWidth,
  gap,
  maxHeight,
  reservedBottom,
  role = 'listbox',
  layoutDeps = [],
}: DropdownPortalProps) {
  const layout = useDropdownPortalLayout({
    open,
    triggerRef,
    minWidth,
    gap,
    maxHeight,
    reservedBottom,
    deps: layoutDeps,
  });

  if (!open || typeof document === 'undefined') return null;

  const body = typeof children === 'function' ? children(layout) : children;

  return createPortal(
    <div
      ref={contentRef}
      role={role}
      className={cn(
        'fixed border-2 border-border bg-card shadow overflow-hidden flex flex-col',
        className
      )}
      style={{
        top: layout.top,
        left: layout.left,
        width: layout.width,
        zIndex: DROPDOWN_PORTAL_Z,
      }}
    >
      {body}
    </div>,
    document.body
  );
}
