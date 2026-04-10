'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export const HOVER_CARD_Z_INDEX = 90;
const HOVER_Z = HOVER_CARD_Z_INDEX;
const EXIT_DURATION_MS = 180;
const GAP_BOTTOM = 8;
/** Match bottom gap so popovers sit equally tight above or below the trigger. */
const GAP_TOP = 8;
const CARD_WIDTH = 280;

/** Matches GifPopoverCard + read-only GIF shell: object-contain inside max height/width box. */
export function estimateGifPopoverDimensions(
  naturalWidth: number,
  naturalHeight: number,
): { width: number; height: number } {
  if (
    !naturalWidth ||
    !naturalHeight ||
    !Number.isFinite(naturalWidth) ||
    !Number.isFinite(naturalHeight)
  ) {
    return { width: CARD_WIDTH, height: 220 };
  }
  const vw = typeof globalThis.window !== 'undefined' ? globalThis.window.innerWidth : 1024;
  const vh = typeof globalThis.window !== 'undefined' ? globalThis.window.innerHeight : 768;
  const maxH = Math.min(13 * 16, 0.38 * vh);
  const maxW = Math.min(340, 0.92 * vw);
  const scale = Math.min(maxW / naturalWidth, maxH / naturalHeight, 1);
  return {
    width: naturalWidth * scale,
    height: naturalHeight * scale,
  };
}

export type HoverCardSide = 'top' | 'bottom' | 'left' | 'right';
type Side = HoverCardSide;
type Align = 'start' | 'center' | 'end';

const VIEWPORT_PAD = 8;

function clampViewport(
  top: number,
  left: number,
  cardW: number,
  cardH: number,
  vw: number,
  vh: number,
): { top: number; left: number } {
  const maxL = Math.max(VIEWPORT_PAD, vw - cardW - VIEWPORT_PAD);
  const maxT = Math.max(VIEWPORT_PAD, vh - cardH - VIEWPORT_PAD);
  return {
    top: Math.max(VIEWPORT_PAD, Math.min(top, maxT)),
    left: Math.max(VIEWPORT_PAD, Math.min(left, maxL)),
  };
}

function rectFullyInViewport(
  top: number,
  left: number,
  cardW: number,
  cardH: number,
  vw: number,
  vh: number,
): boolean {
  return (
    top >= VIEWPORT_PAD &&
    left >= VIEWPORT_PAD &&
    top + cardH <= vh - VIEWPORT_PAD &&
    left + cardW <= vw - VIEWPORT_PAD
  );
}

/**
 * Picks top / bottom / left / right so the card stays in the viewport when possible,
 * otherwise clamps position with minimal shift from the preferred side.
 */
export function computeHoverCardPositionAuto(
  rect: DOMRect,
  preferredSide: Side,
  align: Align,
  cardHeight: number,
  cardWidth: number = CARD_WIDTH,
): { top: number; left: number; side: Side } {
  const vw = typeof globalThis.window !== 'undefined' ? globalThis.window.innerWidth : 1024;
  const vh = typeof globalThis.window !== 'undefined' ? globalThis.window.innerHeight : 768;
  const w = cardWidth;
  const h = cardHeight;

  const order: Side[] = [preferredSide, 'bottom', 'top', 'right', 'left'];
  const seen = new Set<Side>();
  const sides: Side[] = [];
  for (const s of order) {
    if (!seen.has(s)) {
      seen.add(s);
      sides.push(s);
    }
  }

  for (const side of sides) {
    const raw = computeHoverCardPosition(rect, side, align, h, w);
    if (rectFullyInViewport(raw.top, raw.left, w, h, vw, vh)) {
      return { top: raw.top, left: raw.left, side };
    }
  }

  let best: { top: number; left: number; side: Side } | null = null;
  let bestScore = Infinity;
  for (const side of sides) {
    const raw = computeHoverCardPosition(rect, side, align, h, w);
    const clamped = clampViewport(raw.top, raw.left, w, h, vw, vh);
    const dist = Math.abs(clamped.top - raw.top) + Math.abs(clamped.left - raw.left);
    const bias = side === preferredSide ? 0 : 4;
    const score = dist + bias;
    if (score < bestScore) {
      bestScore = score;
      best = { ...clamped, side };
    }
  }
  return best ?? { top: VIEWPORT_PAD, left: VIEWPORT_PAD, side: preferredSide };
}

function horizontalAlign(rect: DOMRect, align: Align, cardWidth: number): number {
  if (align === 'start') return rect.left;
  if (align === 'end') return rect.right - cardWidth;
  return rect.left + rect.width / 2 - cardWidth / 2;
}

function verticalAlign(rect: DOMRect, align: Align, cardHeight: number): number {
  if (align === 'start') return rect.top;
  if (align === 'end') return rect.bottom - cardHeight;
  return rect.top + rect.height / 2 - cardHeight / 2;
}

export function computeHoverCardPosition(
  rect: DOMRect,
  side: Side,
  align: Align,
  cardHeight: number,
  cardWidth: number = CARD_WIDTH,
): { top: number; left: number } {
  if (side === 'bottom') {
    return {
      top: rect.bottom + GAP_BOTTOM,
      left: horizontalAlign(rect, align, cardWidth),
    };
  }
  if (side === 'top') {
    return {
      top: rect.top - cardHeight - GAP_TOP,
      left: horizontalAlign(rect, align, cardWidth),
    };
  }
  if (side === 'right') {
    return {
      top: verticalAlign(rect, align, cardHeight),
      left: rect.right + GAP_BOTTOM,
    };
  }
  return {
    top: verticalAlign(rect, align, cardHeight),
    left: rect.left - cardWidth - GAP_BOTTOM,
  };
}

export function motionAxisOffset(side: Side): { y: number; x: number } {
  switch (side) {
    case 'top':
      return { y: 6, x: 0 };
    case 'bottom':
      return { y: -6, x: 0 };
    case 'left':
      return { y: 0, x: 6 };
    case 'right':
      return { y: 0, x: -6 };
    default:
      return { y: 0, x: 0 };
  }
}

export interface HoverCardProps {
  /** Trigger element that shows the card on hover. */
  children: React.ReactNode;
  /** Content rendered inside the card. */
  content: React.ReactNode;
  /** Preferred placement; flips to another edge if there is not enough viewport space. */
  side?: Side;
  /** Delay in ms before opening. */
  openDelay?: number;
  /** Delay in ms before closing. */
  closeDelay?: number;
  /** Optional class for the trigger wrapper. */
  className?: string;
  /** Optional class for the card panel. */
  contentClassName?: string;
  /** Optional align for card (e.g. 'start' | 'center' | 'end'). */
  align?: Align;
  /** Optional height (px) used for positioning when side is top/left/right. Use a smaller value for short content (e.g. location) so the card sits closer. */
  positioningHeight?: number;
}

export function HoverCard({
  children,
  content,
  side = 'bottom',
  openDelay = 200,
  closeDelay = 100,
  className,
  contentClassName,
  align = 'center',
  positioningHeight = 160,
}: Readonly<HoverCardProps>) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [resolvedSide, setResolvedSide] = useState<Side>(side);
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimeouts = useCallback(() => {
    if (closeDelayTimeoutRef.current) {
      clearTimeout(closeDelayTimeoutRef.current);
      closeDelayTimeoutRef.current = null;
    }
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || typeof document === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const cardHeight = positioningHeight;
    const { top, left, side: nextSide } = computeHoverCardPositionAuto(rect, side, align, cardHeight);
    setPosition({ top, left });
    setResolvedSide(nextSide);
  }, [side, align, positioningHeight]);

  useEffect(() => {
    setResolvedSide(side);
  }, [side]);

  const handleMouseEnter = useCallback(() => {
    setIsClosing(false);
    clearAllTimeouts();
    closeDelayTimeoutRef.current = setTimeout(() => {
      setOpen(true);
      closeDelayTimeoutRef.current = null;
    }, openDelay);
  }, [clearAllTimeouts, openDelay]);

  const handleMouseLeave = useCallback(() => {
    clearAllTimeouts();
    closeDelayTimeoutRef.current = setTimeout(() => {
      setIsClosing(true);
      setOpen(false);
      closeDelayTimeoutRef.current = null;
      exitTimeoutRef.current = setTimeout(() => {
        setIsClosing(false);
        exitTimeoutRef.current = null;
      }, EXIT_DURATION_MS);
    }, closeDelay);
  }, [clearAllTimeouts, closeDelay]);

  const cancelClose = useCallback(() => {
    setIsClosing(false);
    clearAllTimeouts();
    setOpen(true);
  }, [clearAllTimeouts]);

  useEffect(() => {
    if (open && !isClosing) updatePosition();
  }, [open, isClosing, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => {
      clearAllTimeouts();
      setIsClosing(true);
      setOpen(false);
      exitTimeoutRef.current = setTimeout(() => {
        setIsClosing(false);
        exitTimeoutRef.current = null;
      }, EXIT_DURATION_MS);
    };
    globalThis.addEventListener('scroll', handleScroll, true);
    return () => globalThis.removeEventListener('scroll', handleScroll, true);
  }, [open, clearAllTimeouts]);

  useEffect(() => {
    if (!open || isClosing) return;
    const onResize = () => updatePosition();
    globalThis.addEventListener('resize', onResize);
    return () => globalThis.removeEventListener('resize', onResize);
  }, [open, isClosing, updatePosition]);

  useEffect(() => {
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  const showPortal = open || isClosing;
  const axis = motionAxisOffset(resolvedSide);
  const cardEl =
    showPortal &&
    typeof document !== 'undefined' &&
    createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            key="hovercard"
            initial={{ opacity: 0, scale: 0.96, y: axis.y, x: axis.x }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: axis.y, x: axis.x }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={cn(
              'fixed w-[280px] min-h-[80px] max-h-[320px] overflow-hidden border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] pointer-events-auto',
              contentClassName
            )}
            style={{ top: position.top, left: position.left, zIndex: HOVER_Z }}
            role="tooltip"
            onMouseEnter={cancelClose}
            onMouseLeave={handleMouseLeave}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );

  return (
    <div // NOSONAR S6848 — hover wrapper around arbitrary children; native button would nest incorrectly
      ref={triggerRef}
      className={cn('inline-flex transition-opacity duration-150', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {cardEl}
    </div>
  );
}
