'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const HOVER_Z = 90;
const EXIT_DURATION_MS = 180;

export interface HoverCardProps {
  /** Trigger element that shows the card on hover. */
  children: React.ReactNode;
  /** Content rendered inside the card. */
  content: React.ReactNode;
  /** Placement of the card relative to the trigger. */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay in ms before opening. */
  openDelay?: number;
  /** Delay in ms before closing. */
  closeDelay?: number;
  /** Optional class for the trigger wrapper. */
  className?: string;
  /** Optional class for the card panel. */
  contentClassName?: string;
  /** Optional align for card (e.g. 'start' | 'center' | 'end'). */
  align?: 'start' | 'center' | 'end';
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
}: HoverCardProps) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimeouts = () => {
    if (closeDelayTimeoutRef.current) {
      clearTimeout(closeDelayTimeoutRef.current);
      closeDelayTimeoutRef.current = null;
    }
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }
  };

  const updatePosition = () => {
    if (!triggerRef.current || typeof document === 'undefined') return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gapBottom = 8;
    const gapTop = 15;
    const cardWidth = 280;
    const cardHeight = positioningHeight;
    let top = 0;
    let left = 0;
    if (side === 'bottom') {
      top = rect.bottom + gapBottom;
      left = align === 'start' ? rect.left : align === 'end' ? rect.right - cardWidth : rect.left + rect.width / 2 - cardWidth / 2;
    } else if (side === 'top') {
      top = rect.top - cardHeight - gapTop;
      left = align === 'start' ? rect.left : align === 'end' ? rect.right - cardWidth : rect.left + rect.width / 2 - cardWidth / 2;
    } else if (side === 'right') {
      left = rect.right + gapBottom;
      top = align === 'start' ? rect.top : align === 'end' ? rect.bottom - cardHeight : rect.top + rect.height / 2 - cardHeight / 2;
    } else {
      left = rect.left - cardWidth - gapBottom;
      top = align === 'start' ? rect.top : align === 'end' ? rect.bottom - cardHeight : rect.top + rect.height / 2 - cardHeight / 2;
    }
    setPosition({ top, left });
  };

  const handleMouseEnter = () => {
    setIsClosing(false);
    clearAllTimeouts();
    closeDelayTimeoutRef.current = setTimeout(() => {
      setOpen(true);
      closeDelayTimeoutRef.current = null;
    }, openDelay);
  };

  const handleMouseLeave = () => {
    clearAllTimeouts();
    closeDelayTimeoutRef.current = setTimeout(() => {
      setIsClosing(true);
      setOpen(false); // Remove card from tree so AnimatePresence runs exit
      closeDelayTimeoutRef.current = null;
      exitTimeoutRef.current = setTimeout(() => {
        setIsClosing(false);
        exitTimeoutRef.current = null;
      }, EXIT_DURATION_MS);
    }, closeDelay);
  };

  const cancelClose = () => {
    setIsClosing(false);
    clearAllTimeouts();
    setOpen(true);
  };

  useEffect(() => {
    if (open && !isClosing) updatePosition();
  }, [open, isClosing]);

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
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [open]);

  useEffect(() => {
    return () => clearAllTimeouts();
  }, []);

  const showPortal = open || isClosing;
  const cardEl =
    showPortal &&
    typeof document !== 'undefined' &&
    createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            key="hovercard"
            initial={{ opacity: 0, scale: 0.96, y: side === 'top' ? 6 : side === 'bottom' ? -6 : 0, x: side === 'left' ? 6 : side === 'right' ? -6 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: side === 'top' ? 6 : side === 'bottom' ? -6 : 0, x: side === 'left' ? 6 : side === 'right' ? -6 : 0 }}
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
