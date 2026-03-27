'use client';

import { useEffect, useRef, useState } from 'react';
import { getAltchaChallengeUrl } from '@/api/auth';

type Props = {
  /** When false, render nothing (local dev without API base). */
  enabled?: boolean;
  className?: string;
  /**
   * When true, challenge opens as a modal overlay (no inline widget chrome).
   * Pairs with form submit / trigger per ALTCHA docs.
   */
  overlay?: boolean;
};

/**
 * Proof-of-work widget; adds solution payload to the surrounding form as field `altcha`.
 * ALTCHA is loaded only in the browser — the package touches `customElements` and breaks SSR.
 */
export function AltchaField({ enabled = true, className, overlay = true }: Props) {
  const ref = useRef<HTMLElement & { reset?: () => void }>(null);
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

  if (!enabled || !url || !sdkReady) return null;

  return (
    <div className={className}>
      <altcha-widget
        ref={ref}
        challengeurl={url}
        credentials="omit"
        {...(overlay ? { overlay: true } : {})}
      />
    </div>
  );
}
