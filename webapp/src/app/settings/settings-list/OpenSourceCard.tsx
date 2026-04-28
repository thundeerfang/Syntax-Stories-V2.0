'use client';

import React, { useState } from 'react';
import {
  ExternalLink,
  GitFork,
  FolderGit2,
  Unlink,
  Terminal,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const OPEN_SOURCE_FOOTER_MARKS = ['o0', 'o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9'] as const;

type OpenSourceCardProps = Readonly<{
  item: any;
  index: number;
  saving: boolean;
  onOpen: () => void;
  onDetach: () => void;
  hideActions?: boolean;
}>;

export function OpenSourceCard(props: OpenSourceCardProps) {
  const {
    item: p,
    index,
    saving,
    onDetach,
    hideActions = false,
  } = props;
  const repoName = String(p.repoFullName ?? p.title ?? 'UNKNOWN_REPO');
  const repoUrl = String(p.publicationUrl ?? '#');
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  return (
    <div className="group relative ss-settings-card min-w-0 max-w-full overflow-hidden">
      {/* Industrial Sync Node Frame */}
      <div className="ss-card-border relative border-[3px] border-border bg-card overflow-hidden">
        
        {/* Hardware Corner Brackets */}
        <div className="absolute -top-[3px] -left-[3px] size-4 border-t-[3px] border-l-[3px] border-primary z-20" />
        <div className="absolute -bottom-[3px] -right-[3px] size-4 border-b-[3px] border-r-[3px] border-primary z-20" />

        {/* Technical Header — reduced padding */}
        <div className="ss-card-header flex items-center justify-between border-b-[3px] border-border bg-muted/30 px-3 py-1.5 relative z-10 min-w-0">
          <div className="flex items-center gap-3 min-w-0 shrink">
            <FolderGit2 className="size-3.5 text-primary" />
            <span className="text-[10px] font-black font-mono tracking-widest text-foreground uppercase">
              REPO_ID: <span className="text-primary">#{String(index + 1).padStart(2, '0')}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-tighter text-emerald-500/80">
              GITHUB_STABLE
            </span>
          </div>
        </div>

        {/* Main Content Area — compact */}
        <div className="p-3 flex flex-col md:flex-row gap-4 relative z-10 overflow-hidden min-w-0">
          
          {/* GitHub Icon Viewport — reduced size */}
          <div className="ss-card-logo-box relative size-12 shrink-0 border-2 border-border bg-black flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 opacity-[0.2] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:4px_4px]" />
             <GitFork className="ss-icon-scale size-5 text-primary/80" />
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="ss-card-title text-base font-black uppercase tracking-tighter text-foreground leading-tight truncate">
                  {repoName.split('/').pop()}
                </h4>
                <div className="flex items-center gap-2 min-w-0">
                  <Terminal className="size-3 shrink-0 text-primary/50" />
                  <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase truncate min-w-0">
                    {repoName}
                  </p>
                </div>
              </div>

              {/* Button group: shrink-0 so it stays inside card */}
              <div className="flex gap-2 shrink-0">
                {p.publicationUrl && (
                  <a
                    href={p.publicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ss-btn-action size-9 flex items-center justify-center border-2 border-border bg-card active:bg-primary/80"
                    title="View on GitHub"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}
                {!hideActions && (
                  <button
                    type="button"
                    onClick={onDetach}
                    disabled={saving}
                    className="ss-btn-remove size-9 flex items-center justify-center border-2 border-border bg-card disabled:opacity-50"
                    title="Detach Repository"
                  >
                    <Unlink className="size-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Repository Info Tags — tighter */}
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <div className="flex items-center gap-2 px-2 py-1 bg-muted border border-border text-[9px] font-mono font-bold text-muted-foreground uppercase shrink-0">
                <Hash className="size-3 text-primary shrink-0" />
                Branch: Main
              </div>
              <div className="text-[9px] font-mono font-bold text-primary/60 min-w-0 overflow-hidden">
                <span className="block truncate">URI: {repoUrl.replace('https://', '')}</span>
              </div>
            </div>

            {/* Description Block: 2 lines collapsed; click to expand with 4-line scroll */}
            <div className="bg-muted/20 border-l-2 border-primary/30 min-w-0 overflow-hidden flex flex-col pl-5 w-full">
              <button
                type="button"
                onClick={(ev) => {
                  if ((ev.target as HTMLElement).closest('.ss-open-source-desc-scroll')) return;
                  setIsDescExpanded((v) => !v);
                }}
                className="text-left w-full cursor-pointer flex flex-col overflow-hidden min-h-0"
                aria-expanded={isDescExpanded}
                aria-label={isDescExpanded ? 'Collapse description' : 'Expand to read full description'}
              >
                {isDescExpanded ? (
                  <div
                    className="ss-open-source-desc-scroll min-h-0 overflow-y-auto pr-1.5 py-2 max-h-[4.5rem] leading-snug"
                    style={{ scrollbarGutter: 'stable' }}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground break-words break-all">
                      <span className="text-primary font-bold mr-2 shrink-0">REPO_DESC:</span>
                      <span className="break-words break-all">{p.description || 'REMOTE_SOURCE_HAS_NO_DESCRIPTION_META.'}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] font-medium text-muted-foreground leading-snug break-words break-all line-clamp-2 [line-height:1.375rem] py-1.5">
                    <span className="text-primary font-bold mr-2 shrink-0">REPO_DESC:</span>
                    <span className="break-words break-all">{p.description || 'REMOTE_SOURCE_HAS_NO_DESCRIPTION_META.'}</span>
                  </p>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Hardware Deco — reduced padding */}
        <div className="border-t-2 border-border bg-muted/10 px-3 py-1 flex justify-between items-center">
          <div className="flex gap-1">
            {OPEN_SOURCE_FOOTER_MARKS.map((mark, i) => (
              <div
                key={mark}
                className={cn(
                  'h-1.5 w-[2px] bg-primary/20',
                  i % 3 === 0 && 'bg-primary/40',
                )}
              />
            ))}
          </div>
          <span className="text-[9px] font-mono font-bold text-muted-foreground/30 tracking-widest uppercase">
            SYNC_NODE_OK
          </span>
        </div>
      </div>
    </div>
  );
}