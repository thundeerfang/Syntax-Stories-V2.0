'use client';

import { useEffect } from 'react';
import { useSearchDialogStore } from '@/store/searchDialog';
import { SearchDialog } from './SearchDialog';

export function SearchDialogWrapper() {
  const open = useSearchDialogStore((s) => s.open);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open();
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return <SearchDialog />;
}
