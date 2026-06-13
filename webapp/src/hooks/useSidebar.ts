'use client';

import { useSidebarStore } from '@/store/sidebar';
import { useShallow } from 'zustand/react/shallow';

export function useSidebar() {
  return useSidebarStore(
    useShallow((s) => ({
      isOpen: s.isOpen,
      open: s.open,
      close: s.close,
      toggle: s.toggle,
    }))
  );
}
