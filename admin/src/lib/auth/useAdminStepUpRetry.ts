'use client';

import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/store/session';

/**
 * Re-runs `onRetry` after the user completes a 2FA step-up dialog.
 * Use alongside list/mutation loaders so tabs remounted during step-up refetch cleanly.
 */
export function useAdminStepUpRetry(onRetry: () => void | Promise<void>) {
  const stepUpRequired = useSessionStore((s) => s.stepUpRequired);
  const sawStepUp = useRef(false);
  const onRetryRef = useRef(onRetry);

  useEffect(() => {
    onRetryRef.current = onRetry;
  }, [onRetry]);

  useEffect(() => {
    if (stepUpRequired) {
      sawStepUp.current = true;
      return;
    }
    if (!sawStepUp.current) return;
    sawStepUp.current = false;
    void onRetryRef.current();
  }, [stepUpRequired]);
}
