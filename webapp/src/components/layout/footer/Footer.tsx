'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { fetchOperationalPing } from '@/api/operationalHeartbeat';
import { SHELL_RAIL_FROST_CLASS, SHELL_RAIL_FROST_STYLE } from '@/lib/shell/shellContentRail';
import { LEGAL_FOOTER_LINKS } from '@/lib/shell/siteLinks';
import { cn } from '@/lib/core/utils';

const OPERATIONAL_POLL_MS = 12_000;
const OPERATIONAL_FETCH_TIMEOUT_MS = 8000;

/** Footer-only API heartbeat: checkbox tile + `Operational(42ms)` and session max ping. */
function OperationalStatusIndicator() {
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
      const r = await fetchOperationalPing(AbortSignal.timeout(OPERATIONAL_FETCH_TIMEOUT_MS));
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
    const id = setInterval(() => void run(), OPERATIONAL_POLL_MS);
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
          'size-3 shrink-0 border-2 border-border',
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

export function Footer() {
  return (
    <footer
      id="app-footer"
      className="relative z-10 w-full shrink-0 overflow-hidden border-t-2 border-border py-6 sm:py-8"
    >
      <div
        aria-hidden
        className={cn(SHELL_RAIL_FROST_CLASS, 'pointer-events-none absolute inset-0 z-0')}
        style={SHELL_RAIL_FROST_STYLE}
      />
      <div className="relative z-[1] mx-auto max-w-[90rem] px-4 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-xs font-black uppercase tracking-widest text-muted-foreground">
            © {new Date().getFullYear()} Syntax_Stories_Corp // All_Rights_Reserved
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {LEGAL_FOOTER_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs font-black uppercase tracking-widest text-muted-foreground underline-offset-4 decoration-2 hover:text-primary hover:underline"
              >
                {label}
              </Link>
            ))}
            <OperationalStatusIndicator />
          </div>
        </div>
      </div>
    </footer>
  );
}
