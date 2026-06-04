'use client';

import { useEffect, useState } from 'react';

/** Local activity signal for the signed-in user's avatar indicator. */
export type UserPresenceStatus = 'online' | 'away' | 'offline';

function readPresenceStatus(): UserPresenceStatus {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return 'away';
  return 'online';
}

export function useUserPresenceStatus(): UserPresenceStatus {
  const [status, setStatus] = useState<UserPresenceStatus>(() =>
    typeof window === 'undefined' ? 'online' : readPresenceStatus()
  );

  useEffect(() => {
    const sync = () => setStatus(readPresenceStatus());
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return status;
}
