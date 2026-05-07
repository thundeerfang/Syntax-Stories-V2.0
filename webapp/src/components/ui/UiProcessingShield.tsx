'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/store/auth';
import { useUiProcessingLockStore } from '@/store/uiProcessingLock';

/** Above `Dialog` (100) and route loader (100). */
const SHIELD_Z = 110;

// --- ALTCHA busy (shared with AltchaField; refcount = multiple widgets) ---

let altchaBusy = false;
let altchaBusyRefCount = 0;
const altchaListeners = new Set<() => void>();

function emitAltchaBusy(next: boolean): void {
  if (altchaBusy === next) return;
  altchaBusy = next;
  for (const l of altchaListeners) l();
}

function subscribeAltchaBusy(onStoreChange: () => void): () => void {
  altchaListeners.add(onStoreChange);
  return () => altchaListeners.delete(onStoreChange);
}

function getAltchaBusySnapshot(): boolean {
  return altchaBusy;
}

export function acquireGlobalAltchaBusy(): void {
  altchaBusyRefCount += 1;
  if (altchaBusyRefCount === 1) emitAltchaBusy(true);
}

export function releaseGlobalAltchaBusy(): void {
  altchaBusyRefCount = Math.max(0, altchaBusyRefCount - 1);
  if (altchaBusyRefCount === 0) emitAltchaBusy(false);
}

export function useGlobalAltchaBusy(): boolean {
  return useSyncExternalStore(subscribeAltchaBusy, getAltchaBusySnapshot, () => false);
}

/**
 * Full-screen invisible layer + Escape capture while auth requests or ALTCHA run,
 * or while app code holds `useUiProcessingLockStore` / `withUiProcessingLock`.
 */
export function UiProcessingShield() {
  const authBlocking = useAuthStore((s) => Boolean(s.isHydrated && s.isLoading));
  const storeLocked = useUiProcessingLockStore((s) => s.depth > 0);
  const altchaBusyHook = useGlobalAltchaBusy();

  const active = authBlocking || storeLocked || altchaBusyHook;

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [active]);

  if (!active || typeof document === 'undefined') return null;

  const node = (
    <div
      className="fixed inset-0 cursor-wait bg-transparent"
      style={{ zIndex: SHIELD_Z }}
      aria-hidden
      aria-busy="true"
      onPointerDownCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => e.stopPropagation()}
    />
  );

  return createPortal(node, document.body);
}
