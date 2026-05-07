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
import type { PublicFeedPostAuthor } from '@/types/blog';

const EXIT_MS = 180;

export function BlogPostAuthor({ author }: Readonly<{ author: PublicFeedPostAuthor }>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
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
  const profilePath = `/u/${author.username}`;

  const portal =
    (open || isClosing) &&
    typeof document !== 'undefined' &&
    createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            ref={portalRef}
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
        className="inline-flex w-fit max-w-full items-center gap-3"
        role="group"
        aria-label="Post author"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
      >
        <Link href={profilePath} className="shrink-0 border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]">
          <img
            src={author.profileImg}
            alt=""
            className="h-12 w-12 object-cover md:h-14 md:w-14"
          />
        </Link>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-black uppercase leading-none text-muted-foreground">Originator</p>
          <p className="mt-1 font-mono text-sm font-black uppercase leading-tight text-foreground md:text-base">
            {author.fullName?.trim() || author.username}
          </p>
          <Link href={profilePath} className="mt-0.5 block font-mono text-sm font-bold text-primary hover:underline md:text-base">
            @{author.username}
          </Link>
        </div>
      </div>
      {portal}
    </>
  );
}
