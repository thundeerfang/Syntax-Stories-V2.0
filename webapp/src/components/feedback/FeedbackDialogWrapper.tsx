'use client';

import { useUIStore } from '@/store/ui';
import { FeedbackDialog } from './FeedbackDialog';

export function FeedbackDialogWrapper() {
  const open = useUIStore((s) => s.feedbackDialogOpen);
  const setOpen = useUIStore((s) => s.setFeedbackDialogOpen);
  return <FeedbackDialog open={open} onClose={() => setOpen(false)} />;
}
