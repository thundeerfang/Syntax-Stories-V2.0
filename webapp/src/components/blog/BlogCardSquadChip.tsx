'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  computeHoverCardPositionAuto,
  HOVER_CARD_Z_INDEX,
  motionAxisOffset,
  type HoverCardSide,
} from '@/components/ui/HoverCard';
import { SquadPopoverCard } from '@/components/blog/SquadPopoverCard';
import { WarningConfirmDialog } from '@/components/ui/delete';
import { cn } from '@/lib/utils';
import type { PublicFeedSquad } from '@/types/blog';

const EXIT_MS = 180;
const POPOVER_CARD_H = 220;
const POPOVER_CARD_W = 260;

function resolveSquadAsset(url: string | undefined): string | undefined {
  const t = url?.trim();
  if (!t) return undefined;
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:')) return t;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return `${base.replace(/\/$/, '')}${t.startsWith('/') ? '' : '/'}${t}`;
}

function triggerIconSrc(squad: PublicFeedSquad): string {
  const resolved = resolveSquadAsset(squad.iconUrl);
  if (resolved) return resolved;
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(squad.slug)}`;
}

export function BlogCardSquadChip({ squad }: Readonly<{ squad: PublicFeedSquad }>) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [resolvedSide, setResolvedSide] = useState<HoverCardSide>('bottom');
  const [privateWarnOpen, setPrivateWarnOpen] = useState(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const squadHref = `/squads/${encodeURIComponent(squad.slug)}`;

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
      const { top, left, side } = computeHoverCardPositionAuto(
        rect,
        'bottom',
        'start',
        POPOVER_CARD_H,
        POPOVER_CARD_W,
        0,
      );
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
      const { top, left, side } = computeHoverCardPositionAuto(
        rect,
        'bottom',
        'start',
        POPOVER_CARD_H,
        POPOVER_CARD_W,
        0,
      );
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

  const onLogoClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (squad.visibility === 'public') {
        router.push(squadHref);
        return;
      }
      setPrivateWarnOpen(true);
    },
    [router, squad.visibility, squadHref],
  );

  const iconSrc = triggerIconSrc(squad);

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
            className="fixed overflow-visible p-0 pointer-events-auto"
            style={{ top: position.top, left: position.left, zIndex: HOVER_CARD_Z_INDEX }}
            role="tooltip"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <SquadPopoverCard
              squad={squad}
              squadHref={squadHref}
              interactiveSurface={squad.visibility === 'public'}
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
        className="inline-flex max-w-full min-w-0 shrink-0"
        role="group"
        aria-label="Squad"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
      >
        <button
          type="button"
          onClick={onLogoClick}
          title={squad.visibility === 'public' ? squad.name : `${squad.name} (private)`}
          className={cn(
            'relative shrink-0 overflow-hidden rounded-full border-2 border-border bg-muted object-cover transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            'h-6 w-6',
          )}
        >
          <img src={iconSrc} alt="" className="size-full object-cover" />
        </button>
      </div>
      {portal}
      <WarningConfirmDialog
        open={privateWarnOpen}
        onClose={() => setPrivateWarnOpen(false)}
        titleId="blog-card-private-squad-title"
        title="This squad is private"
        description="Only members can open the full squad page. Ask someone in the squad for an invite."
        confirmLabel="Got it"
        onConfirm={() => setPrivateWarnOpen(false)}
      />
    </>
  );
}
