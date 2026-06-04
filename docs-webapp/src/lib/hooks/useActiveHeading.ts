'use client';

import { useEffect, useState } from 'react';

/** Tracks which heading id is currently in view for TOC highlighting. */
export function useActiveHeading(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const idKey = ids.join('|');

  useEffect(() => {
    if (ids.length === 0) {
      setActive(null);
      return;
    }

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const next = visible[0]?.target.id;
        if (next) setActive(next);
      },
      { rootMargin: '-15% 0px -55% 0px', threshold: [0, 0.1, 0.5, 1] }
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [idKey, ids]);

  return active;
}
