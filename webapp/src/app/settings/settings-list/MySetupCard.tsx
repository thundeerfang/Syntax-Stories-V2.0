'use client';

import React from 'react';
import { ExternalLink, Pencil, Trash2, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SetupItem = { label: string; imageUrl: string; productUrl?: string };

export function MySetupCard({
  item,
  index,
  saving,
  onEdit,
  onRemove,
  hideActions = false,
}: {
  item: SetupItem;
  index: number;
  saving: boolean;
  onEdit: () => void;
  onRemove: () => void;
  hideActions?: boolean;
}) {
  const rawId = String(index + 1);
  const displayId = rawId.padStart(2, '0');
  const hasProduct = Boolean((item.productUrl ?? '').trim());

  return (
    <div className="group relative ss-settings-card">
      <div className="ss-card-border relative border-[3px] border-border bg-card">
        <div className="absolute -top-[3px] -left-[3px] size-4 border-t-[3px] border-l-[3px] border-primary z-10" />
        <div className="absolute -bottom-[3px] -right-[3px] size-4 border-b-[3px] border-r-[3px] border-primary z-10" />

        <div className="ss-card-header flex items-center justify-between border-b-[3px] border-border bg-muted/30 px-3 py-1.5 relative z-10">
          <div className="flex items-center gap-3">
            <Wrench className="size-3.5 text-primary" />
            <span className="text-[10px] font-black font-mono tracking-widest text-foreground">
              SETUP_ID: <span className="text-primary">#{displayId}</span>
            </span>
          </div>

          {!hideActions ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={onEdit}
                className="ss-btn-action flex items-center gap-2 px-2 py-1 text-[10px] font-black uppercase border-2 border-border bg-background hover:bg-muted/50 disabled:opacity-50"
              >
                <Pencil className="size-3.5" /> Edit
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onRemove}
                className="ss-btn-remove flex items-center gap-2 px-2 py-1 text-[10px] font-black uppercase border-2 border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" /> Delete
              </button>
            </div>
          ) : null}
        </div>

        <div className="p-3 flex gap-3">
          <div className="shrink-0">
            <div className="size-12 border-2 border-border bg-muted/30 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.label}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-black leading-snug text-foreground truncate">
                  {item.label || 'Untitled'}
                </div>
                {hasProduct ? (
                  <a
                    href={item.productUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      'inline-flex items-center gap-1 mt-1 text-[11px] font-bold uppercase tracking-wide',
                      'text-primary hover:underline'
                    )}
                  >
                    <ExternalLink className="size-3.5" />
                    Product
                  </a>
                ) : (
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    No product link
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

