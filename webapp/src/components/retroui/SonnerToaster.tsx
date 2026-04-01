'use client';

import { useEffect } from 'react';
import { Toaster, toast, useSonner } from 'sonner';

const MAX_TOASTS = 5;
const DEFAULT_DURATION_MS = 5000;

/** Drops oldest notifications when more than MAX_TOASTS so rapid clicks cannot pile up unbounded. */
function ToastPruner() {
  const { toasts } = useSonner();
  useEffect(() => {
    if (toasts.length <= MAX_TOASTS) return;
    const snapshot = [...toasts];
    const removeCount = snapshot.length - MAX_TOASTS;
    for (let i = 0; i < removeCount; i++) {
      const t = snapshot[snapshot.length - 1 - i];
      if (t) toast.dismiss(t.id);
    }
  }, [toasts]);
  return null;
}

export function SonnerToaster() {
  return (
    <>
      <ToastPruner />
      <Toaster
        position="bottom-right"
        richColors={false}
        closeButton
        visibleToasts={MAX_TOASTS}
        duration={DEFAULT_DURATION_MS}
        toastOptions={{
          duration: DEFAULT_DURATION_MS,
          classNames: {
            // Do not use position:relative here — Sonner stacks toasts with position:absolute + transforms.
            toast:
              '!rounded-lg !border-2 !border-border !bg-card !text-foreground !shadow-[4px_4px_0_0_var(--border)] !font-sans !px-4 !py-3 !min-h-[3rem]',
            /** Reserve space so absolutely positioned close button never overlaps title/description text. */
            content: '!min-w-0 !flex-1 !pr-9',
            title: '!text-sm !font-bold !tracking-tight !text-foreground !break-words',
            description: '!text-xs !text-muted-foreground !mt-0.5 !break-words',
            closeButton:
              '!absolute !left-auto !top-3 !right-2 !translate-x-0 !translate-y-0 !flex !size-6 !min-h-6 !min-w-6 !shrink-0 !items-center !justify-center !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-muted/60 !rounded-sm !text-muted-foreground hover:!text-foreground !z-[2] [&_svg]:!size-3.5 [&_svg]:!shrink-0',
            success:
              '!border-emerald-600 dark:!border-emerald-500 !bg-card',
            error: '!border-destructive !bg-card',
            warning: '!border-amber-500 dark:!border-amber-400 !bg-card',
            info: '!border-primary !bg-card',
          },
        }}
      />
    </>
  );
}
