'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { Database, HardDrive, ServerCrash } from 'lucide-react';
import { BlockShadowButton } from '@/components/ui/button';
import { fetchStorageHealth, type StorageHealthResult } from '@/lib/api/fetchStorageHealth';
import { resolvePublicApiBase } from '@/lib/api/publicApiBase';
import { cn } from '@/lib/core/utils';
import { useScrollLock } from '@/hooks/useScrollLock';

/** Above ConnectivityGate (130) so storage block wins when both fire. */
const STORAGE_Z = 135;

const CLOUD_LOTTIE_SRC = `/lottie/${encodeURIComponent('Cloud robotics abstract.lottie')}`;

const DotLottieReact = dynamic(
  () => import('@lottiefiles/dotlottie-react').then((m) => m.DotLottieReact),
  { ssr: false }
);

type GateState = 'unknown' | 'ok' | 'blocked';

function reasonLabel(reason: StorageHealthResult['reason']): string {
  if (reason === 'mongo_quota') return 'Database storage is at capacity.';
  if (reason === 'disk_full') return 'Upload storage is at capacity.';
  return 'The platform is temporarily not accepting new data.';
}

function ReasonIcon({ reason }: Readonly<{ reason: StorageHealthResult['reason'] }>) {
  if (reason === 'mongo_quota') return <Database className="size-4" strokeWidth={2.25} aria-hidden />;
  if (reason === 'disk_full') return <HardDrive className="size-4" strokeWidth={2.25} aria-hidden />;
  return <ServerCrash className="size-4" strokeWidth={2.25} aria-hidden />;
}

export function StorageGate() {
  const titleId = useId();
  const descId = useId();
  const statusId = useId();
  const [gate, setGate] = useState<GateState>('unknown');
  const [health, setHealth] = useState<StorageHealthResult>({
    blocked: false,
    reason: null,
    since: null,
  });
  const [isChecking, setIsChecking] = useState(false);
  const prevGateRef = useRef<GateState>('unknown');

  const runCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      const base = resolvePublicApiBase();
      if (!base) {
        setGate('ok');
        return;
      }
      const result = await fetchStorageHealth(base);
      setHealth(result);
      setGate(result.blocked ? 'blocked' : 'ok');
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  useEffect(() => {
    const prev = prevGateRef.current;
    if (prev === 'blocked' && gate === 'ok') {
      const id = globalThis.setTimeout(() => {
        globalThis.window?.location.reload();
      }, 380);
      prevGateRef.current = gate;
      return () => globalThis.clearTimeout(id);
    }
    prevGateRef.current = gate;
  }, [gate]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void runCheck();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [runCheck]);

  useEffect(() => {
    const ms = gate === 'ok' ? 45_000 : 4000;
    const id = globalThis.setInterval(() => void runCheck(), ms);
    return () => globalThis.clearInterval(id);
  }, [gate, runCheck]);

  useEffect(() => {
    if (gate !== 'blocked') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [gate]);

  const blocked = gate === 'blocked';
  useScrollLock(blocked);

  const overlay = (
    <AnimatePresence>
      {blocked && (
        <>
          <motion.div
            key="storage-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 min-h-full min-w-full bg-black/75 backdrop-blur-sm pointer-events-auto"
            style={{ zIndex: STORAGE_Z }}
            aria-hidden
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: STORAGE_Z }}
          >
            <motion.div
              key="storage-panel"
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
                'pointer-events-auto w-full max-w-md overflow-hidden border-2 border-destructive/40 bg-card',
                'shadow'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center px-5 py-8 text-center sm:px-8">
                <p
                  id={statusId}
                  className="mb-5 flex items-center justify-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-destructive"
                >
                  <span className="inline-flex size-1.5 animate-pulse bg-destructive" aria-hidden />
                  Storage full
                </p>

                <div className="mb-6 flex size-12 items-center justify-center border-2 border-border bg-muted text-destructive">
                  <ReasonIcon reason={health.reason} />
                </div>

                <div className="mb-8 flex justify-center text-foreground" aria-hidden>
                  <div className="size-[120px] opacity-80">
                    <DotLottieReact
                      src={CLOUD_LOTTIE_SRC}
                      loop
                      autoplay
                      style={{ width: '100%', height: '100%' }}
                      renderConfig={{ autoResize: true }}
                    />
                  </div>
                </div>

                <div className="mb-6 max-w-sm space-y-2">
                  <h2
                    id={titleId}
                    className="font-sans text-base font-black uppercase tracking-wide text-foreground"
                  >
                    Saving is paused
                  </h2>
                  <p
                    id={descId}
                    className="text-xs font-medium leading-relaxed text-muted-foreground"
                  >
                    {reasonLabel(health.reason)} You can still browse, but new posts, uploads, and
                    feedback cannot be saved until storage is restored.
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
                  Check again
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
