'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UsersRound } from 'lucide-react';
import { Dialog } from './dialogs';
import { cn } from '@/lib/core/utils';

export type InfoSwiperSlide = {
  id: string;
  title: string;
  /** Supporting copy under the headline. */
  body?: ReactNode;
  /** Replace the default hero illustration for this slide. */
  hero?: ReactNode;
};

export type InfoSwiperDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  /** Must be non-empty; typically 3 slides. */
  slides: InfoSwiperSlide[];
  /** Stable id for `aria-labelledby` (first slide title id). */
  titleId?: string;
  closeLabel?: string;
  /** Label on the first step primary button. Default `Start`. */
  startLabel?: string;
  nextLabel?: string;
  doneLabel?: string;
  /** Optional class on the panel (merged with defaults). */
  panelClassName?: string;
}>;

function DefaultHero() {
  return (
    <div className="relative mx-auto flex size-[7.5rem] shrink-0 items-center justify-center">
      <div
        className="absolute inset-0 bg-gradient-to-br from-violet-200 via-fuchsia-200 to-violet-400 opacity-95 shadow"
        aria-hidden
      />
      <div
        className="relative flex size-[4.5rem] items-center justify-center bg-white/20 backdrop-blur-[2px]"
        aria-hidden
      >
        <UsersRound className="size-10 text-white shadow" strokeWidth={2} aria-hidden />
      </div>
      {/* Decorative “orbit” chips — abstract stand-ins for member avatars */}
      <span
        className="absolute -right-1 top-2 size-9 border-2 border-white/80 bg-gradient-to-br from-amber-200 to-orange-300 shadow"
        aria-hidden
      />
      <span
        className="absolute -left-2 bottom-3 size-9 border-2 border-white/80 bg-gradient-to-br from-sky-200 to-indigo-300 shadow"
        aria-hidden
      />
      <span
        className="absolute -bottom-1 left-1/2 size-9 -translate-x-1/2 border-2 border-white/80 bg-gradient-to-br from-emerald-200 to-teal-300 shadow"
        aria-hidden
      />
    </div>
  );
}

/**
 * Informational dialog with a simple step swiper (no extra dependency).
 * Layout: hero strip, dark body, footer — similar in spirit to confirm dialogs but for onboarding / tips.
 */
export function InfoSwiperDialog({
  open,
  onClose,
  slides,
  titleId: titleIdProp,
  closeLabel = 'Close',
  startLabel = 'Start',
  nextLabel = 'Next',
  doneLabel = 'Done',
  panelClassName,
}: InfoSwiperDialogProps) {
  const reactId = useId().replaceAll(':', '');
  const baseTitleId = titleIdProp ?? `info-swiper-title-${reactId}`;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const last = slides.length - 1;
  const safeIndex = slides.length === 0 ? 0 : Math.min(index, last);
  const slide = slides[safeIndex];
  const isLast = safeIndex >= last;

  const goNext = useCallback(() => {
    if (isLast) onClose();
    else setIndex((i) => Math.min(i + 1, last));
  }, [isLast, last, onClose]);

  if (slides.length === 0) return null;

  const primaryLabel = isLast ? doneLabel : safeIndex === 0 ? startLabel : nextLabel;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={baseTitleId}
      showCloseButton={false}
      closeOnBackdropClick
      closeOnEscape
      panelClassName={cn(
        'max-w-lg overflow-hidden -3xl border-2 border-violet-500 bg-black p-0 text-white shadow',
        panelClassName,
      )}
      contentClassName="p-0 flex flex-col max-h-[min(90vh,640px)]"
    >
      {/* Hero — purple strip + custom close (matches onboarding reference) */}
      <div className="relative shrink-0 bg-gradient-to-b from-violet-600 to-violet-700 px-6 pb-8 pt-10">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center border-2 border-white/90 bg-transparent text-white transition-colors hover:bg-white/15"
          aria-label="Close"
        >
          <X className="size-5" strokeWidth={2.5} aria-hidden />
        </button>
        <div className="flex justify-center pt-1">{slide?.hero ?? <DefaultHero />}</div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-black px-6 py-8">
        <span id={baseTitleId} className="sr-only">
          Information, step {safeIndex + 1} of {slides.length}: {slide?.title}
        </span>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={slide?.id ?? safeIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center text-center"
            aria-live="polite"
          >
            <h2 className="text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
              {slide?.title}
            </h2>
            {slide?.body != null ? (
              <div className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">{slide.body}</div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div
        className={cn(
          'flex shrink-0 items-center gap-3 border-t border-white/10 bg-zinc-950 px-5 py-4 sm:px-6',
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-300"
        >
          {closeLabel}
        </button>
        <div className="flex flex-1 justify-center gap-2" role="tablist" aria-label="Slide">
          {slides.map((s, i) => (
            <span
              key={s.id}
              role="presentation"
              className={cn(
                'h-2 w-2  transition-colors',
                i === safeIndex ? 'bg-white' : 'bg-zinc-600',
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={goNext}
          className="shrink-0 border-2 border-transparent bg-white px-5 py-2.5 text-sm font-bold text-black shadow transition-transform hover:bg-zinc-100 active:translate-y-px"
        >
          {primaryLabel}
        </button>
      </div>
    </Dialog>
  );
}
