'use client';

import { useEffect, useState } from 'react';

const TICK_MS = 1000;

/** Re-renders once per second for countdown UIs tied to absolute deadlines. */
export function useSessionCountdown(deadlineAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  if (!deadlineAt) return 0;
  return Math.max(0, deadlineAt - now);
}
