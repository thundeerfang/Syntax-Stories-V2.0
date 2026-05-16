'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  computeHoverCardPositionAuto,
  HOVER_CARD_Z_INDEX,
  motionAxisOffset,
  type HoverCardSide,
} from '@/components/ui/HoverCard';
import { MentionPopoverCard } from '@/components/ui/MentionPopoverCard';
import { cn } from '@/lib/utils';
import type { PublicFeedPostAuthor } from '@/types/blog';

const EXIT_MS = 180;

export function BlogPostAuthor({
  author,
  children,
  className,
  variant = 'default',
}: Readonly<{
  author: PublicFeedPostAuthor;
  /** When set, this is the hover target instead of the default “Originator” block (e.g. blog card footer). */
  children?: React.ReactNode;
  className?: string;
  /** Distinct chrome on the post reading rail (no retro drop shadow). */
  variant?: 'default' | 'sideRail';
}>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [resolvedSide, setResolvedSide] = useState<HoverCardSide>('bottom');
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  const scheduleOpen = useCallback(() => {
    clearTimers();
    openTimerRef.current = setTimeout(() => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const { top, left, side } = computeHoverCardPositionAuto(rect, 'bottom', 'start', 155, 260, 0);
      setPosition({ top, left });
      setResolvedSide(side);
      setOpen(true);
      setIsClosing(false);
      openTimerRef.current = null;
    }, 200);
  }, [clearTimers]);

  const scheduleClose = useCallback(() => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => {
      setIsClosing(true);
      setOpen(false);
      closeTimerRef.current = null;
      exitTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        exitTimerRef.current = null;
      }, EXIT_MS);
    }, 100);
  }, [clearTimers]);

  const cancelClose = useCallback(() => {
    clearTimers();
    setIsClosing(false);
    setOpen(true);
  }, [clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (!open || isClosing) return;
    const onResize = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const { top, left, side } = computeHoverCardPositionAuto(rect, 'bottom', 'start', 155, 260, 0);
      setPosition({ top, left });
      setResolvedSide(side);
    };
    globalThis.addEventListener('resize', onResize);
    return () => globalThis.removeEventListener('resize', onResize);
  }, [open, isClosing]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => {
      clearTimers();
      setIsClosing(true);
      setOpen(false);
      exitTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        exitTimerRef.current = null;
      }, EXIT_MS);
    };
    globalThis.addEventListener('scroll', handleScroll, true);
    return () => globalThis.removeEventListener('scroll', handleScroll, true);
  }, [open, clearTimers]);

  const axis = motionAxisOffset(resolvedSide);
  const profilePath = `/u/${encodeURIComponent(author.username)}`;
  const customTrigger = children !== undefined && children !== null;

  const portal =
    (open || isClosing) &&
    typeof document !== 'undefined' &&
    createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: axis.y, x: axis.x }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: axis.y, x: axis.x }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed overflow-visible pointer-events-auto p-0"
            style={{ top: position.top, left: position.left, zIndex: HOVER_CARD_Z_INDEX }}
            role="tooltip"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <MentionPopoverCard
              username={author.username}
              initialFullName={author.fullName}
              initialProfileImg={author.profileImg}
              profileHref={profilePath}
            />
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );

  return (
    <>
      <div
        ref={wrapRef}
        className={cn(
          customTrigger
            ? cn('group/blog-author-popover inline-flex max-w-full min-w-0', className)
            : 'inline-flex w-fit max-w-full items-center gap-3',
        )}
        role="group"
        aria-label="Post author"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
      >
        {customTrigger ? (
          children
        ) : (
          <>
            <Link
              href={profilePath}
              className={cn(
                'shrink-0 overflow-hidden rounded-none',
                variant === 'sideRail'
                  ? 'bg-transparent shadow-[4px_4px_0_0_var(--border)]'
                  : 'border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]',
              )}
            >
              <img
                src={author.profileImg}
                alt=""
                className={cn('object-cover', variant === 'sideRail' ? 'h-11 w-11 md:h-12 md:w-12' : 'h-12 w-12 md:h-14 md:w-14')}
              />
            </Link>
            <div className="min-w-0">
              {variant !== 'sideRail' ? (
                <p className="font-mono text-[10px] font-black uppercase leading-none text-muted-foreground">
                  Originator
                </p>
              ) : null}
              <p
                className={cn(
                  'font-mono font-black uppercase leading-tight text-foreground',
                  variant === 'sideRail' ? 'text-xs md:text-sm' : 'mt-1 text-sm md:text-base',
                )}
              >
                {author.fullName?.trim() || author.username}
              </p>
              <Link
                href={profilePath}
                className={cn(
                  'mt-0.5 block font-mono font-bold text-primary hover:underline',
                  variant === 'sideRail' ? 'text-xs md:text-sm' : 'text-sm md:text-base',
                )}
              >
                @{author.username}
              </Link>
            </div>
          </>
        )}
      </div>
      {portal}
    </>
  );
}

