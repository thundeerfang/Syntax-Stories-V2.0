"use client";
import { useEffect, useRef, useState } from "react";
import { ROUTE_RESTORE_EVENT } from "@/lib/shell/routeRestore";
export function useRouteRestoreNonce(): number {
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const onRestore = () => setNonce((n) => n + 1);
    globalThis.addEventListener(ROUTE_RESTORE_EVENT, onRestore);
    return () => globalThis.removeEventListener(ROUTE_RESTORE_EVENT, onRestore);
  }, []);
  return nonce;
}
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
