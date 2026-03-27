'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const HOVER_Z = 90;
const EXIT_DURATION_MS = 180;
const GAP_BOTTOM = 8;
const GAP_TOP = 15;
const CARD_WIDTH = 280;

type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'center' | 'end';

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

function computeHoverCardPosition(
  rect: DOMRect,
  side: Side,
  align: Align,
  cardHeight: number,
): { top: number; left: number } {
  if (side === 'bottom') {
    return {
      top: rect.bottom + GAP_BOTTOM,
      left: horizontalAlign(rect, align, CARD_WIDTH),
    };
  }
  if (side === 'top') {
    return {
      top: rect.top - cardHeight - GAP_TOP,
      left: horizontalAlign(rect, align, CARD_WIDTH),
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
    left: rect.left - CARD_WIDTH - GAP_BOTTOM,
  };
}

function motionAxisOffset(side: Side): { y: number; x: number } {
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
  /** Placement of the card relative to the trigger. */
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
    setPosition(computeHoverCardPosition(rect, side, align, cardHeight));
  }, [side, align, positioningHeight]);

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
    return () => clearAllTimeouts();
  }, [clearAllTimeouts]);

  const showPortal = open || isClosing;
  const axis = motionAxisOffset(side);
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
    // NOSONAR S6848 — hover-only trigger wraps arbitrary children (often buttons); a native button would nest incorrectly
    <div
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
