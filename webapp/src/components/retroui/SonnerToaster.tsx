'use client';

import { Toaster } from 'sonner';

export function SonnerToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors={false}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            '!rounded-lg !border-2 !border-border !bg-card !text-foreground !shadow-[4px_4px_0_0_var(--border)] !font-sans !px-4 !py-3 !min-h-[3rem]',
          title: '!text-sm !font-bold !tracking-tight !text-foreground',
          description: '!text-xs !text-muted-foreground !mt-0.5',
          closeButton:
            '!border !border-border !bg-transparent hover:!bg-muted !rounded-md !left-auto !right-2 !top-1/2 !-translate-y-1/2 !text-muted-foreground hover:!text-foreground',
          success:
            '!border-emerald-600 dark:!border-emerald-500 !bg-card',
          error: '!border-destructive !bg-card',
          warning: '!border-amber-500 dark:!border-amber-400 !bg-card',
          info: '!border-primary !bg-card',
        },
      }}
    />
  );
}
