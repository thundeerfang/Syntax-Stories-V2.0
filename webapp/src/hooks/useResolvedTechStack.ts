"use client";
import { useEffect, useMemo, useState } from "react";
import type { TechStackItem } from "@contracts/referenceApi";
import { searchApi } from "@/api/search";
export function useResolvedTechStack(
  names: readonly string[],
): TechStackItem[] {
  const [items, setItems] = useState<TechStackItem[]>([]);
  const namesKey = names.join("\0");
  const stableNames = useMemo(() => names, [namesKey]);
  useEffect(() => {
    let cancelled = false;
    const list = stableNames.filter((n) => n.trim().length > 0);
    if (list.length === 0) {
      setItems([]);
      return () => {
        cancelled = true;
      };
    }
    void searchApi.resolveTechStack([...list]).then((resolved) => {
      if (!cancelled) setItems(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [stableNames]);
  return items;
}
