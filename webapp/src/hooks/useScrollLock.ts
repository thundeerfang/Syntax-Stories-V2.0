'use client';

import { useEffect } from 'react';
import { acquireScrollLock } from '@/lib/dom/scrollLock';

/** Locks document scroll while `locked` is true (nested-safe via ref counting). */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    return acquireScrollLock();
  }, [locked]);
}
