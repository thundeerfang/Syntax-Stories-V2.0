'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Cloud, Laptop, Server } from 'lucide-react';
import { BlockShadowButton } from '@/components/ui/button';
import { fetchBackendHealth } from '@/lib/api/fetchBackendHealth';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';
import { cn } from '@/lib/core/utils';
import { useScrollLock } from '@/hooks/useScrollLock';

/** Above {@link UiProcessingShield} (110) and {@link DIALOG_Z_INDEX} (100). */
const CONNECTIVITY_Z = 130;

/** Let the connectivity overlay exit (~220ms) before a hard reload so the transition feels smooth. */
const RELOAD_AFTER_RECOVERY_MS = 380;

const CLOUD_LOTTIE_SRC = `/lottie/${encodeURIComponent('Cloud robotics abstract.lottie')}`;

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((m) => m.DotLottieReact),
  { ssr: false }
);

type GateState = 'unknown' | 'ok' | 'offline' | 'backend_down';

function ConnectionSegment({
  active,
  broken,
  className,
}: Readonly<{ active?: boolean; broken?: boolean; className?: string }>) {
  return (
    <div
      className={cn(
        'h-1 min-w-[2.5rem] flex-1  transition-colors duration-300',
        broken && 'bg-destructive/45',
        !broken && active && 'bg-primary animate-pulse',
        !broken && !active && 'bg-muted-foreground/25',
        className
      )}
      aria-hidden
    />
  );
}

export function ConnectivityGate() {
  const titleId = useId();
  const descId = useId();
  const statusId = useId();
  const [gate, setGate] = useState<GateState>('unknown');
  const [isChecking, setIsChecking] = useState(false);
  const prevGateRef = useRef<GateState>('unknown');

  const runCheck = useCallback(async () => {
    if (typeof navigator === 'undefined') return;

    setIsChecking(true);
    try {
      if (!navigator.onLine) {
        setGate('offline');
        return;
      }

      const base = resolvePublicApiBase();
      if (!base) {
        setGate('ok');
        return;
      }

      const healthy = await fetchBackendHealth(base);
      if (!navigator.onLine) {
        setGate('offline');
        return;
      }
      setGate(healthy ? 'ok' : 'backend_down');
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  useEffect(() => {
    const prev = prevGateRef.current;
    if ((prev === 'offline' || prev === 'backend_down') && gate === 'ok') {
      const id = globalThis.setTimeout(() => {
        globalThis.window?.location.reload();
      }, RELOAD_AFTER_RECOVERY_MS);
      prevGateRef.current = gate;
      return () => globalThis.clearTimeout(id);
    }
    prevGateRef.current = gate;
  }, [gate]);

  useEffect(() => {
    const onLineEvent = () => void runCheck();
    globalThis.window?.addEventListener('online', onLineEvent);
    globalThis.window?.addEventListener('offline', onLineEvent);
    const onVis = () => {
      if (document.visibilityState === 'visible') void runCheck();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      globalThis.window?.removeEventListener('online', onLineEvent);
      globalThis.window?.removeEventListener('offline', onLineEvent);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [runCheck]);

  useEffect(() => {
    const ms = gate === 'ok' ? 45_000 : 4000;
    const id = globalThis.setInterval(() => void runCheck(), ms);
    return () => globalThis.clearInterval(id);
  }, [gate, runCheck]);

  useEffect(() => {
    if (gate === 'ok' || gate === 'unknown') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [gate]);

  const blocked = gate === 'offline' || gate === 'backend_down';
  useScrollLock(blocked);

  const title = gate === 'offline' ? 'No internet connection' : "Can't reach the server";
  const subtitle =
    gate === 'offline'
      ? 'Check your Wi‑Fi or mobile data. We’ll reconnect when you’re back online.'
      : 'The app can’t talk to our services right now. We’ll keep trying.';

  const line1Broken = gate === 'offline';
  const line1Ok = gate === 'backend_down';
  const line2Broken = gate === 'offline' || gate === 'backend_down';

  const overlay = (
    <AnimatePresence>
      {blocked && (
        <>
          <motion.div
            key="connectivity-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 min-h-full min-w-full bg-black/70 backdrop-blur-sm pointer-events-auto"
            style={{ zIndex: CONNECTIVITY_Z }}
            aria-hidden
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: CONNECTIVITY_Z }}
          >
            <motion.div
              key="connectivity-panel"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descId}
              aria-busy={isChecking}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22 }}
              className={cn(
                'pointer-events-auto w-full max-w-md overflow-hidden border-2 border-border bg-card',
                'shadow'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center px-5 py-8 text-center sm:px-8">
                <p
                  id={statusId}
                  className="mb-5 flex items-center justify-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary"
                >
                  <span className="inline-flex size-1.5 animate-pulse bg-primary" aria-hidden />
                  Reconnecting…
                </p>

                <div className="mb-8 flex justify-center text-foreground" aria-hidden>
                  <div className="size-[140px] sm:size-[160px]">
                    <DotLottieReact
                      src={CLOUD_LOTTIE_SRC}
                      loop
                      autoplay
                      style={{ width: '100%', height: '100%' }}
                      renderConfig={{ autoResize: true }}
                    />
                  </div>
                </div>

                <div className="mb-8 flex w-full max-w-xs items-center gap-1.5 sm:max-w-sm">
                  <div className="flex size-9 shrink-0 items-center justify-center border-2 border-border bg-muted text-foreground">
                    <Laptop className="size-4" strokeWidth={2.25} aria-hidden />
                  </div>
                  <ConnectionSegment active={line1Ok} broken={line1Broken} />
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center border-2 border-border bg-muted text-foreground',
                      gate === 'offline' && 'opacity-40'
                    )}
                  >
                    <Cloud className="size-4" strokeWidth={2.25} aria-hidden />
                  </div>
                  <ConnectionSegment active={false} broken={line2Broken} />
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center border-2 border-border bg-muted text-foreground',
                      gate === 'backend_down' && 'ring-2 ring-destructive/35'
                    )}
                  >
                    <Server className="size-4" strokeWidth={2.25} aria-hidden />
                  </div>
                </div>

                <div className="mb-6 max-w-sm space-y-2">
                  <h2
                    id={titleId}
                    className="font-sans text-base font-black uppercase tracking-wide text-foreground"
                  >
                    {title}
                  </h2>
                  <p
                    id={descId}
                    className="text-xs font-medium leading-relaxed text-muted-foreground"
                  >
                    {subtitle}
                  </p>
                </div>

                <BlockShadowButton
                  type="button"
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={isChecking}
                  onClick={() => void runCheck()}
                  aria-describedby={statusId}
                >
                  Reconnect
                </BlockShadowButton>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(overlay, document.body);
}
