'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TechStackItem } from '@contracts/referenceApi';
import { resolveTechStack } from '@/lib/blog/referenceSearch';

/** Resolve display names to catalog rows with iconUrl from the backend. */
export function useResolvedTechStack(names: readonly string[]): TechStackItem[] {
  const [items, setItems] = useState<TechStackItem[]>([]);
  const namesKey = names.join('\0');
  // Compare by content, not array reference — callers often pass inline literals.
  const stableNames = useMemo(() => names, [namesKey]); // eslint-disable-line react-hooks/exhaustive-deps -- namesKey

  useEffect(() => {
    let cancelled = false;
    const list = stableNames.filter((n) => n.trim().length > 0);

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
  }, [stableNames]);

  return items;
}
