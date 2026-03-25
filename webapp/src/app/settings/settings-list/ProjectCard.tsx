'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  Calendar, 
  ExternalLink, 
  FolderGit2, 
  Link2, 
  Pencil, 
  Trash2, 
  Archive,
  Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HoverCard } from '@/components/ui/HoverCard';
import { LinkPreviewCardContent } from '@/components/ui/LinkPreviewCardContent';

type MediaItem = { url: string; title?: string; altText?: string };

export function ProjectCard({
  project: e,
  index,
  saving,
  onEdit,
  onRemove,
  onPreviewMedia,
  formatMonthYear,
  domainFromUrl,
  isImageUrl,
  hideActions = false,
}: {
  project: any;
  index: number;
  saving: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onPreviewMedia: (item: MediaItem) => void;
  formatMonthYear: (value: string) => string;
  domainFromUrl: (value: string) => string;
  isImageUrl: (url: string) => boolean;
  hideActions?: boolean;
}) {
  const pubStr = e.publicationDate ? formatMonthYear(e.publicationDate) : '';
  const endStr = e.endDate ? formatMonthYear(e.endDate) : e.ongoing ? 'PRESENT' : '';
  const dateRange = [pubStr, endStr].filter(Boolean).join(' // ');
  const isPub = e.type === 'publication';
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  return (
    <div key={index} className="group relative ss-settings-card min-w-0 max-w-full overflow-hidden">
      {/* Archive-style Industrial Frame */}
      <div className="ss-card-border relative border-[3px] border-border bg-card overflow-hidden">
        
        {/* Hardware Corner Brackets */}
        <div className="absolute -top-[3px] -left-[3px] size-4 border-t-[3px] border-l-[3px] border-primary z-20" />
        <div className="absolute -bottom-[3px] -right-[3px] size-4 border-b-[3px] border-r-[3px] border-primary z-20" />

        {/* Technical Header — reduced padding */}
        <div className="ss-card-header flex items-center justify-between border-b-[3px] border-border bg-muted/30 px-3 py-1.5 relative z-10 min-w-0">
          <div className="flex items-center gap-3 min-w-0 shrink">
            <Archive className="size-3.5 text-primary" />
            <span className="text-[10px] font-black font-mono tracking-widest text-foreground uppercase truncate">
              {isPub ? 'PUB_ID' : 'PRJ_ID'}: <span className="text-primary">#{String(index + 1).padStart(2, '0')}</span>
            </span>
          </div>

          {/* Type Badge - project or publication */}
          <div className={cn(
            "px-2 py-0.5 border border-border text-[8px] font-black font-mono tracking-tighter uppercase",
            isPub ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
          )}>
            {isPub ? 'publication' : 'project'}
          </div>
        </div>

        {/* Main Body */}
        <div className="p-3 flex flex-col md:flex-row gap-4 relative z-10 min-w-0">
          
          {/* Content Type Icon Viewport — reduced size */}
          <div className="ss-card-logo-box relative size-12 shrink-0 border-2 border-border bg-background flex items-center justify-center overflow-hidden">
            {/* CRT Grid Effect */}
            <div className="absolute inset-0 opacity-[0.1] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:4px_4px]" />
            
            {isPub ? (
              <BookOpen className="ss-card-title size-5 text-primary/60" />
            ) : (
              <FolderGit2 className="ss-card-title size-5 text-primary/60" />
            )}
          </div>

          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <h4 className="ss-card-title text-base font-black uppercase tracking-tighter text-foreground leading-tight truncate">
                  {e.title || 'UNTITLED_ENTRY'}
                </h4>
                {e.publisher && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Hash className="size-3 text-primary/50" />
                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-tight truncate">
                      {e.publisher}
                    </p>
                  </div>
                )}
              </div>

              {/* Standard Action Buttons */}
              {!hideActions && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onEdit}
                    className="ss-btn-action size-9 flex items-center justify-center border-2 border-border bg-card"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onRemove}
                    disabled={saving}
                    className="ss-btn-remove size-9 flex items-center justify-center border-2 border-border bg-card disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Technical Metadata Row */}
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              {dateRange && (
                <div className="flex items-center gap-2 px-2 py-1 bg-muted border border-border text-[9px] font-mono font-bold text-muted-foreground shrink-0">
                  <Calendar className="size-3 text-primary shrink-0" />
                  <span className="break-words">DATE: {dateRange}</span>
                </div>
              )}
              {e.publicationUrl && (
                <HoverCard
                  content={<LinkPreviewCardContent domain={domainFromUrl(e.publicationUrl)} />}
                  side="top"
                  align="start"
                  contentClassName="w-[280px] p-0 border-2 border-primary"
                >
                  <a
                    href={e.publicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ss-link-pill flex items-center gap-2 px-2 py-1 border border-primary/30 text-[9px] font-mono font-bold text-primary min-w-0 overflow-hidden"
                  >
                    <ExternalLink className="size-3 shrink-0" />
                    <span className="truncate">LIVE_REPOSITORY</span>
                  </a>
                </HoverCard>
              )}
            </div>

            {/* SUMMARY_LOG: 2 lines collapsed; click to expand with 4-line scroll */}
            {e.description && (
              <div className="bg-muted/20 border-l-2 border-primary/30 min-w-0 overflow-hidden flex flex-col pl-5 w-full">
                <button
                  type="button"
                  onClick={() => setIsSummaryExpanded((v) => !v)}
                  className="text-left w-full cursor-pointer flex flex-col overflow-hidden min-h-0"
                  aria-expanded={isSummaryExpanded}
                  aria-label={isSummaryExpanded ? 'Collapse summary' : 'Expand to read full summary'}
                >
                  {isSummaryExpanded ? (
                    <div
                      className="min-h-0 overflow-y-auto pr-1.5 py-2 max-h-[4.5rem] leading-snug"
                      style={{ scrollbarGutter: 'stable' }}
                      onClick={(ev) => ev.stopPropagation()}
                      role="presentation"
                    >
                      <p className="text-[11px] font-medium text-muted-foreground break-words break-all">
                        <span className="text-primary font-bold mr-2 shrink-0">SUMMARY_LOG:</span>
                        <span className="break-words break-all">{e.description}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] font-medium text-muted-foreground leading-snug break-words break-all line-clamp-2 [line-height:1.375rem] py-1.5">
                      <span className="text-primary font-bold mr-2 shrink-0">SUMMARY_LOG:</span>
                      <span className="break-words break-all">{e.description}</span>
                    </p>
                  )}
                </button>
              </div>
            )}

            {/* Media Thumbnails */}
            {e.mediaItems && e.mediaItems.length > 0 && (
              <div className="pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {e.mediaItems.slice(0, 4).map((m: MediaItem, j: number) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => onPreviewMedia(m)}
                      className="ss-cert-media-wrap size-8 border-2 border-border bg-background overflow-hidden flex items-center justify-center relative"
                    >
                      {isImageUrl(m.url) ? (
                        <img src={m.url} alt="" className="size-full object-cover" />
                      ) : (
                        <Link2 className="size-3.5 text-muted-foreground/40" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Hardware Deco — reduced padding */}
        <div className="border-t-2 border-border bg-muted/10 px-3 py-1 flex justify-between items-center">
          <div className="flex gap-1.5 items-center">
            <div className="h-2 w-8 bg-muted-foreground/10 rounded-full overflow-hidden">
               <div className="h-full bg-primary/40 w-2/3" />
            </div>
            <span className="text-[8px] font-mono font-bold text-muted-foreground/40 tracking-widest uppercase">
              V.ARCHIVE_ENTRY
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold text-muted-foreground/30">
            PRJ_TYPE: {isPub ? 'STATIONARY' : 'ITERATIVE'}
          </span>
        </div>
      </div>
    </div>
  );
}