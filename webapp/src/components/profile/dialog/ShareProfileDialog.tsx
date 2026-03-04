'use client';

import React from 'react';
import { Share2, Copy, Github, Twitter, Globe, Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PROFILE_URL = 'https://daily.dev/harshitkushwah';

export interface ShareProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ShareProfileDialog({ open, onClose }: ShareProfileDialogProps) {
  const [copied, setCopied] = React.useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE_URL);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="share-dialog-title"
      panelClassName={cn(
        'pointer-events-auto w-full max-w-sm max-h-[90vh] overflow-y-auto',
        'border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)]'
      )}
      contentClassName="relative p-6 pt-10"
      backdropClassName="fixed inset-0 z-50 bg-black/40"
    >
      <h2 id="share-dialog-title" className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
        <Share2 className="size-4 text-primary" /> Share profile
      </h2>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
        Anyone with this link can view your public profile.
      </p>
      <div className="flex gap-2 mb-6">
        <div className="flex-1 min-w-0 bg-muted/50 border-2 border-border p-3 pr-2">
          <span className="text-[10px] font-bold truncate block text-foreground">{PROFILE_URL}</span>
        </div>
        <button
          type="button"
          onClick={copyUrl}
          className={cn(
            'shrink-0 flex items-center gap-2 px-4 py-2 border-2 border-border font-black text-[10px] uppercase tracking-widest transition-all',
            copied
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card hover:bg-muted shadow-[4px_4px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5'
          )}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="border-t-2 border-border pt-4">
        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-3">Share to</p>
        <div className="flex gap-3">
          {[
            { Icon: Github, label: 'GitHub' },
            { Icon: Twitter, label: 'Twitter' },
            { Icon: Globe, label: 'Web' },
          ].map(({ Icon, label }) => (
            <button
              key={label}
              type="button"
              aria-label={`Share to ${label}`}
              className="flex flex-col items-center gap-1 p-3 border-2 border-border bg-muted/30 hover:bg-muted/60 hover:border-primary transition-colors"
            >
              <Icon className="size-5 text-foreground" />
              <span className="text-[8px] font-bold uppercase tracking-widest">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
