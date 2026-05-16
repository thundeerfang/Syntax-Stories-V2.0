'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchOperationalPing } from '@/api/operationalHeartbeat';
import { cn } from '@/lib/utils';

const POLL_MS = 12_000;
const FETCH_TIMEOUT_MS = 8000;

/**
 * Footer-only API heartbeat: one checkbox-style tile + `Operational(42ms)` and session max ping.
 */
export function OperationalStatusIndicator() {
  const [hydrated, setHydrated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [maxLatencyMs, setMaxLatencyMs] = useState<number | null>(null);

  const run = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setOk(false);
      setLatencyMs(null);
      setChecking(false);
      return;
    }
    try {
      const r = await fetchOperationalPing(AbortSignal.timeout(FETCH_TIMEOUT_MS));
      const lat = r.latencyMs ?? null;
      setLatencyMs(lat);
      setOk(r.ok === true);
      setChecking(false);
      if (r.ok === true && lat != null) {
        setMaxLatencyMs((prev) => (prev == null ? lat : Math.max(prev, lat)));
      }
    } catch {
      setOk(false);
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
      setOk(false);
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

  const title = [
    ok ? 'API reachable' : 'API unreachable',
    latencyMs != null && !checking ? `Last ${latencyMs}ms` : null,
    maxLatencyMs != null ? `Session max ${maxLatencyMs}ms` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const showLatency = hydrated && latencyMs != null && !checking && ok;

  return (
    <div
      className="flex shrink-0 items-center gap-2"
      title={hydrated ? title : undefined}
    >
      <div
        className={cn(
          'size-3 shrink-0 border-2 border-border shadow-[1px_1px_0_0_var(--border)]',
          !hydrated && 'bg-muted',
          hydrated && checking && 'animate-pulse bg-muted',
          hydrated && !checking && ok && 'bg-emerald-600 dark:bg-emerald-500',
          hydrated && !checking && !ok && 'bg-red-600 dark:bg-red-500',
          'motion-reduce:animate-none',
        )}
        role="img"
        aria-label={
          !hydrated ? 'Backend status initializing' : checking ? 'Checking backend' : ok ? 'Operational' : 'Offline'
        }
      />
      <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {!hydrated || checking ? (
          <span className="text-muted-foreground">…</span>
        ) : ok && showLatency ? (
          <>
            Operational({latencyMs}ms)
            {maxLatencyMs != null ? (
              <span className="ml-1.5 font-semibold normal-case text-muted-foreground/80">
                max {maxLatencyMs}ms
              </span>
            ) : null}
          </>
        ) : (
          'Offline'
        )}
      </span>
    </div>
  );
}
