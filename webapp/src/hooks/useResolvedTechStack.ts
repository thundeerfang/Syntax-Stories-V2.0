'use client';

import { useEffect, useState } from 'react';
import type { TechStackItem } from '@contracts/referenceApi';
import { resolveTechStack } from '@/lib/blog/referenceSearch';

/** Resolve display names to catalog rows with iconUrl from the backend. */
export function useResolvedTechStack(names: readonly string[]): TechStackItem[] {
  const [items, setItems] = useState<TechStackItem[]>([]);
  const namesKey = names.join('\0');

  useEffect(() => {
    let cancelled = false;
    const list = names.filter((n) => n.trim().length > 0);

    if (list.length === 0) {
      setItems([]);
      return () => {
        cancelled = true;
      };
    }

    void resolveTechStack([...list]).then((resolved) => {
      if (!cancelled) setItems(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [namesKey]);

  return items;
}
