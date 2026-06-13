'use client';

import { useDropdown } from '@/components/ui/dropdown';

/**
 * @deprecated Prefer `useDropdown` from `@/components/ui/dropdown`.
 * Thin wrapper for inline dropdowns that keep the panel inside `ref`.
 */
export function useDismissiblePanel<T extends HTMLElement = HTMLDivElement>() {
  const { rootRef, open, setOpen, toggle, close } = useDropdown<T>();
  return { ref: rootRef, open, setOpen, toggle, close };
}
