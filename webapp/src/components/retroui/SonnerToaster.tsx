'use client';

import { Toaster } from 'sonner';

const toastClass =
  '!rounded-none !border-2 !border-border !bg-card !shadow-md !text-foreground';
const titleClass =
  '!text-xl !font-black !italic !tracking-tighter !text-foreground';

export function SonnerToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: toastClass,
          title: titleClass,
          description: '!text-foreground',
          closeButton:
            '!border-2 !border-border !bg-transparent hover:!bg-muted !rounded-none !left-auto !right-2 !top-1/2 !-translate-y-1/2',
          success: '!border-green-600 dark:!border-green-500',
          error: '!border-destructive',
          warning: '!border-amber-600 dark:!border-amber-500',
          info: '!border-primary',
        },
      }}
    />
  );
}
