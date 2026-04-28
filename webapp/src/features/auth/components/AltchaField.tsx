'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getAltchaChallengeUrl } from '@/api/auth';
import { acquireGlobalAltchaBusy, releaseGlobalAltchaBusy } from '@/components/ui/UiProcessingShield';

function isAltchaBusyState(state: string): boolean {
  return state === 'verifying' || state === 'code';
}

type Props = {
  /** When false, render nothing (local dev without API base). */
  enabled?: boolean;
  className?: string;
  /**
   * Full-screen modal flow (auto=onsubmit). Do not use together with `floating` — combining them breaks the widget (backdrop only).
   */
  overlay?: boolean;
  /** Floating panel anchored to `floatingAnchor`. Recommended inside transformed parents (e.g. Framer Motion dialogs). */
  floating?: 'auto' | 'top' | 'bottom';
  /** CSS selector for the anchor element (e.g. `#my-submit`). */
  floatingAnchor?: string;
  /** Pixel offset from the floating anchor (ALTCHA default is 12). */
  floatingOffset?: number;
};

/**
 * Proof-of-work widget; adds solution payload to the surrounding form as field `altcha`.
 * ALTCHA is loaded only in the browser — the package touches `customElements` and breaks SSR.
 */
export function AltchaField({
  enabled = true,
  className,
  overlay = false,
  floating,
  floatingAnchor,
  floatingOffset,
}: Readonly<Props>) {
  const ref = useRef<HTMLElement & { reset?: () => void }>(null);
  const altchaHoldRef = useRef(false);
  const prevAltchaStateRef = useRef<string | null>(null);
  const url = getAltchaChallengeUrl();
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!enabled || !url) return;
    let cancelled = false;
    void import('altcha').then(() => {
      if (!cancelled) setSdkReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, url]);

  useEffect(() => {
    const el = ref.current;
    if (!sdkReady || !el || typeof el.reset !== 'function') return;
    el.reset();
  }, [url, enabled, sdkReady]);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !url || !sdkReady || !el) return;

    const onStateChange = (ev: Event) => {
      const ce = ev as CustomEvent<{ state?: string }>;
      const state = ce.detail?.state;
      if (!state) return;
      const prev = prevAltchaStateRef.current;
      prevAltchaStateRef.current = state;
      const prevBusy = prev != null && isAltchaBusyState(prev);
      const nextBusy = isAltchaBusyState(state);
      if (!prevBusy && nextBusy) {
        acquireGlobalAltchaBusy();
        altchaHoldRef.current = true;
      } else if (prevBusy && !nextBusy) {
        releaseGlobalAltchaBusy();
        altchaHoldRef.current = false;
      }
    };

    el.addEventListener('statechange', onStateChange);
    return () => {
      el.removeEventListener('statechange', onStateChange);
      if (altchaHoldRef.current) {
        releaseGlobalAltchaBusy();
        altchaHoldRef.current = false;
      }
      prevAltchaStateRef.current = null;
    };
  }, [enabled, url, sdkReady]);

  if (!enabled || !url || !sdkReady) return null;

  const useFloating = floating != null;
  const useOverlay = Boolean(overlay) && !useFloating;

  const floatingProps = useFloating
    ? {
        floating,
        ...(floatingAnchor === undefined ? {} : { floatinganchor: floatingAnchor }),
        floatingoffset: floatingOffset ?? 8,
      }
    : {};

  return (
    <div className={cn(useFloating && 'contents', className)}>
      <altcha-widget
        ref={ref}
        challengeurl={url}
        credentials="omit"
        {...(useOverlay ? { overlay: true } : {})}
        {...floatingProps}
      />
    </div>
  );
}
