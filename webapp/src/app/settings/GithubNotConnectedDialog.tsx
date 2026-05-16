'use client';

import Link from 'next/link';
import { Dialog } from '@/components/ui/Dialog';
import { GithubConnectLottie } from '@/components/ui/GithubConnectLottie';
import { cn } from '@/lib/utils';
import { settingsBtnBlockPrimarySm } from '@/app/settings/buttonStyles';

export function GithubNotConnectedDialog({
  open,
  onClose,
}: Readonly<{
  open: boolean;
  onClose: () => void;
}>) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="github-not-connected-dialog-title"
      showCloseButton={false}
      panelClassName="max-w-md border-4 border-border shadow-[8px_8px_0px_0px_var(--border)]"
      contentClassName="flex min-h-0 flex-col gap-5 px-6 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8"
    >
      <h2 id="github-not-connected-dialog-title" className="sr-only">
        GitHub not connected
      </h2>
      <div className="space-y-1 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">GitHub not connected</p>
      
      </div>
      <div className="flex justify-center py-1">
        <GithubConnectLottie size={132} />
      </div>
      <p className="text-xs font-medium leading-relaxed text-muted-foreground">
        Go to <span className="font-black text-foreground">Security → Connected accounts</span>, link GitHub, then return here and open{' '}
        <span className="font-black text-foreground">Add open source</span> again.
      </p>
      <Link
        href="/settings?section=connected-accounts"
        className={cn(
          settingsBtnBlockPrimarySm,
          'flex w-full items-center justify-center px-5 py-2.5 text-xs tracking-wide no-underline',
        )}
        onClick={onClose}
      >
        Open Connected accounts
      </Link>
    </Dialog>
  );
}
