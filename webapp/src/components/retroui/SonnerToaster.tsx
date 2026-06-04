'use client';

import { useEffect } from 'react';
import { Toaster, toast, useSonner } from 'sonner';
import { NOTIFICATION_TOASTER_ID } from '@/components/notifications/NotificationRealtimeBridge';

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
        id={NOTIFICATION_TOASTER_ID}
        position="top-right"
        richColors={false}
        closeButton
        visibleToasts={MAX_TOASTS}
        duration={6000}
        toastOptions={{
          duration: 7000,
          classNames: {
            toast:
              '! !border-2 !border-primary/30 !bg-card !text-foreground !shadow-lg !font-sans !px-4 !py-3.5 !min-h-[4rem]',
            content: '!min-w-0 !flex-1 !pr-9',
            title: '!text-sm !font-black !tracking-tight !text-foreground !break-words',
            description: '!text-xs !text-muted-foreground !mt-1 !break-words',
            closeButton:
              '!absolute !right-3 !top-9 !z-10 !flex !h-6 !w-6 !-translate-y-1/2 !items-center !justify-center !rounded-md !border-0 !bg-transparent !p-0 !shadow-none !text-muted-foreground transition-colors hover:!bg-muted/60 hover:!text-foreground [&_svg]:!h-3.5 [&_svg]:!w-3.5',
            info: '!border-primary !bg-card',
          },
        }}
      />
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
              '! !border-2 !border-border !bg-card !text-foreground !shadow !font-sans !px-4 !py-3 !min-h-[3rem]',
            /** Reserve space so absolutely positioned close button never overlaps title/description text. */
            content: '!min-w-0 !flex-1 !pr-9',
            title: '!text-sm !font-bold !tracking-tight !text-foreground !break-words',
            description: '!text-xs !text-muted-foreground !mt-0.5 !break-words',
            closeButton:
              '!absolute !right-3 !top-8 !z-10 !flex !h-6 !w-6 !-translate-y-1/2 !items-center !justify-center !rounded-md !border-0 !bg-transparent !p-0 !shadow-none !text-muted-foreground transition-colors hover:!bg-muted/60 hover:!text-foreground [&_svg]:!h-3.5 [&_svg]:!w-3.5',
            success: '!border-emerald-600 dark:!border-emerald-500 !bg-card',
            error: '!border-destructive !bg-card',
            warning: '!border-amber-500 dark:!border-amber-400 !bg-card',
            info: '!border-primary !bg-card',
          },
        }}
      />
    </>
  );
}
