'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useUIStore } from '@/store/ui';

export function FloatingActions() {
  const feedbackVisible = useUIStore((s) => s.feedbackButtonVisible);

  const openFeedback = () => {
    window.open('/feedback', '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-20 flex flex-col items-end gap-2 pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-stretch gap-2">
        <AnimatePresence>
          {feedbackVisible && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={openFeedback}
              aria-label="Send feedback"
              className="flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-border bg-card text-foreground shadow-[4px_4px_0px_0px_var(--border)] hover:bg-primary hover:text-primary-foreground hover:border-primary active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-[10px] font-black uppercase tracking-widest"
            >
              <MessageSquare className="size-5 shrink-0" strokeWidth={2.5} />
              <span>Feedback</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
