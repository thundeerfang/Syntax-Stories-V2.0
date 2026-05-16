'use client';

import { useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEngagementEffectsStore } from '@/store/engagementEffects';

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((m) => m.DotLottieReact),
  { ssr: false },
);

const LIGHTNING_AUTO_DISMISS_MS = 2400;
const LIGHTNING_SIZE_PX = 300;
const LIGHTNING_GAP_PX = 6;

type DotLottieHandle = {
  play: () => void;
  pause: () => void;
  stop: () => void;
};

/** Lightning above Respect button; transparent dismiss layer (no dark overlay). */
export function GlobalEngagementEffects() {
  const reduceMotion = useReducedMotion();
  const visible = useEngagementEffectsStore((s) => s.lightningVisible);
  const anchor = useEngagementEffectsStore((s) => s.lightningAnchor);
  const dismissLightning = useEngagementEffectsStore((s) => s.dismissLightning);
  const instRef = useRef<DotLottieHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    instRef.current?.stop();
    dismissLightning();
  }, [dismissLightning]);

  useEffect(() => {
    if (!visible) return undefined;
    timerRef.current = setTimeout(dismiss, LIGHTNING_AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, dismiss]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, dismiss]);

  if (reduceMotion || !anchor) return null;

  const centerX = anchor.left + anchor.width / 2;
  const top = anchor.top - LIGHTNING_SIZE_PX - LIGHTNING_GAP_PX;
  const left = centerX - LIGHTNING_SIZE_PX / 2;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="respect-lightning-layer"
          role="presentation"
          aria-hidden
          className="fixed inset-0 z-[200] cursor-pointer bg-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={dismiss}
        >
          <div
            className="pointer-events-none fixed"
            style={{
              left,
              top,
              width: LIGHTNING_SIZE_PX,
              height: LIGHTNING_SIZE_PX,
            }}
          >
            <motion.div
              className="size-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <DotLottieReact
                src="/lottie/lightning.lottie"
                loop={false}
                autoplay
                dotLottieRefCallback={(instance) => {
                  instRef.current = instance as DotLottieHandle;
                  instance?.play();
                }}
                style={{ width: LIGHTNING_SIZE_PX, height: LIGHTNING_SIZE_PX, display: 'block' }}
                renderConfig={{ autoResize: true }}
              />
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
