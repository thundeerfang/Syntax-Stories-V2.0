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
            '!relative !rounded-lg !border-2 !border-border !bg-card !text-foreground !shadow-[4px_4px_0_0_var(--border)] !font-sans !px-4 !py-3 !min-h-[3rem]',
          /** Reserve space so absolutely positioned close button never overlaps title/description text. */
          content: '!min-w-0 !flex-1 !pr-9',
          title: '!text-sm !font-bold !tracking-tight !text-foreground !break-words',
          description: '!text-xs !text-muted-foreground !mt-0.5 !break-words',
          closeButton:
            '!absolute !right-1.5 !top-1/2 !left-auto !-translate-y-1/2 !flex !size-6 !min-h-6 !min-w-6 !shrink-0 !items-center !justify-center !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-muted/60 !rounded-sm !text-muted-foreground hover:!text-foreground !z-[2] [&_svg]:!size-3.5 [&_svg]:!shrink-0',
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
