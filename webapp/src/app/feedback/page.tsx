'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/store/ui';

/**
 * Opens the global feedback dialog (same as the floating “Feedback” control).
 * Useful for deep links from docs or support pages.
 */
export default function FeedbackPage() {
  const setOpen = useUIStore((s) => s.setFeedbackDialogOpen);

  useEffect(() => {
    setOpen(true);
  }, [setOpen]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-sm font-medium text-muted-foreground">
        The feedback form should appear in a dialog. Use the <span className="text-foreground">Feedback</span> button
        at the bottom-right if it did not open.
      </p>
    </div>
  );
}
