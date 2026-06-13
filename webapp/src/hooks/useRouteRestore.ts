'use client';

import { useEffect, useRef, useState } from 'react';
import { ROUTE_RESTORE_EVENT } from '@/lib/shell/routeRestore';

/**
 * Bumps a nonce when the user returns via back/forward or bfcache so data effects can re-run.
 * Pair with `useEffect(..., [..., restoreNonce])` for fetches that may have been cancelled mid-flight.
 */
export function useRouteRestoreNonce(): number {
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const onRestore = () => setNonce((n) => n + 1);
    globalThis.addEventListener(ROUTE_RESTORE_EVENT, onRestore);
    return () => globalThis.removeEventListener(ROUTE_RESTORE_EVENT, onRestore);
  }, []);

  return nonce;
}

/** Run `callback` whenever route restore fires (not on every render). */
export function useRouteRestore(callback: () => void): void {
  const restoreNonce = useRouteRestoreNonce();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    callbackRef.current();
  }, [restoreNonce]);
}
