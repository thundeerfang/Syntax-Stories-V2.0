'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Click-outside dismiss for dropdowns, popovers, and menus.
 */
export function useDismissiblePanel<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => setOpen(false), []);

  return { ref, open, setOpen, toggle, close };
}
