'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchOperationalPing } from '@/api/operationalHeartbeat';
import { cn } from '@/lib/utils';

const POLL_MS = 12_000;
const FETCH_TIMEOUT_MS = 8000;

/** Filled cubes from the left: 3 = best RTT, 0 = unreachable / offline. No yellow tier. */
function tierFromLatency(ok: boolean, latencyMs: number): 0 | 1 | 2 | 3 {
  if (!ok) return 0;
  if (latencyMs < 380) return 3;
  if (latencyMs < 950) return 2;
  if (latencyMs < 2200) return 1;
  return 1;
}

function statusLabel(tier: 0 | 1 | 2 | 3, checking: boolean): string {
  if (checking) return 'Checking';
  if (tier === 3) return 'Operational';
  if (tier === 2) return 'Degraded';
  if (tier === 1) return 'Limited';
  return 'Offline';
}

export function OperationalStatusIndicator() {
  /** False for SSR + first client paint only — same visuals as "checking" but static cubes (no pulse) for stable hydration. */
  const [hydrated, setHydrated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tier, setTier] = useState<0 | 1 | 2 | 3>(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const run = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setTier(0);
      setLatencyMs(null);
      setChecking(false);
      return;
    }
    try {
      const r = await fetchOperationalPing(AbortSignal.timeout(FETCH_TIMEOUT_MS));
      if (!r.ok) {
        setTier(0);
        setLatencyMs(r.latencyMs ?? null);
        setChecking(false);
        return;
      }
      setLatencyMs(r.latencyMs);
      setTier(tierFromLatency(true, r.latencyMs));
      setChecking(false);
    } catch {
      setTier(0);
      setLatencyMs(null);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    setHydrated(true);
    void run();
    const id = setInterval(() => void run(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run();
    };
    document.addEventListener('visibilitychange', onVisible);
    const onOnline = () => void run();
    const onOffline = () => {
      setTier(0);
      setLatencyMs(null);
      setChecking(false);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [run]);

  const label = !hydrated ? 'Checking' : statusLabel(tier, checking);
  const labelClass = !hydrated
    ? 'text-muted-foreground'
    : checking
      ? 'text-muted-foreground'
      : tier === 3
        ? 'text-emerald-600 dark:text-emerald-400'
        : tier === 2
          ? 'text-emerald-700 dark:text-emerald-300'
          : tier === 1
            ? 'text-red-500 dark:text-red-400'
            : 'text-red-600 dark:text-red-500';

  const titleParts = [
    `API heartbeat: ${statusLabel(tier, checking)}`,
    latencyMs != null && !checking ? `Last RTT ${latencyMs}ms` : null,
    checking ? 'Measuring…' : null,
  ].filter(Boolean);

  return (
    <div
      className="flex min-w-0 w-full max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:w-auto"
      title={hydrated ? titleParts.join(' · ') : undefined}
    >
      <p className="min-w-0 text-xs font-bold uppercase tracking-tighter text-muted-foreground">
        System_Status: <span className={cn('font-black', labelClass)}>{label}</span>
        {hydrated && latencyMs != null && !checking && tier > 0 ? (
          <span className="ml-1.5 font-mono text-[10px] font-normal normal-case text-muted-foreground">
            ({latencyMs}ms)
          </span>
        ) : null}
      </p>
      <div
        className="flex shrink-0 gap-1"
        role="img"
        aria-label={
          !hydrated
            ? 'Backend connectivity initializing'
            : `Backend connectivity ${checking ? 'checking' : `${tier} of 3 cubes`}`
        }
      >
        {([0, 1, 2] as const).map((i) => {
          const filledGreen = hydrated && !checking && tier > i;
          const mutedPulse = hydrated && checking;
          const redPulse = hydrated && !checking && !filledGreen;
          return (
            <div
              key={i}
              className={cn(
                'size-2.5 shrink-0 border-2 border-border shadow-[1px_1px_0_0_var(--border)]',
                !hydrated && 'bg-muted',
                mutedPulse && 'animate-pulse bg-muted',
                filledGreen && 'bg-emerald-600 dark:bg-emerald-500',
                redPulse && 'animate-pulse bg-red-600 dark:bg-red-500',
                'motion-reduce:animate-none',
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
