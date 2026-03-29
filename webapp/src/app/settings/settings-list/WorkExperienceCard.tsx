'use client';

import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Clock,
  Globe,
  ImageOff,
  Link2,
  MapPin,
  Pencil,
  Trash2,
  TrendingUp,
  Fingerprint,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HoverCard } from '@/components/ui/HoverCard';
import { LinkPreviewCardContent } from '@/components/ui/LinkPreviewCardContent';
import type { WorkExperience } from '@/api/auth';

type MediaItem = { url: string; title?: string; altText?: string };

/** Work card uses backend fields beyond the base `WorkExperience` type. */
export type WorkExperienceForCard = WorkExperience & {
  companyLogo?: string;
  promotions?: Array<{
    jobTitle?: string;
    startDate?: string;
    media?: MediaItem[];
    mediaItems?: MediaItem[];
  }>;
  mediaItems?: MediaItem[];
};

function mediaItemsOf(entry: { media?: MediaItem[]; mediaItems?: MediaItem[] }): MediaItem[] {
  if (Array.isArray(entry.mediaItems)) return entry.mediaItems;
  if (Array.isArray(entry.media)) return entry.media;
  return [];
}

export type WorkExperienceCardProps = {
  /** experience.workId is from DB (backend auto-generates when saving work experience) */
  experience: WorkExperienceForCard;
  index: number;
  saving: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onPreviewMedia: (item: MediaItem) => void;
  formatMonthYear: (value: string) => string;
  locationWithoutType: (value: string) => string;
  normalizeDomain: (value: string) => string;
  isImageUrl: (url: string) => boolean;
  hideActions?: boolean;
};

export function WorkExperienceCard({
  experience: e,
  index,
  saving,
  onEdit,
  onRemove,
  onPreviewMedia,
  formatMonthYear,
  locationWithoutType,
  normalizeDomain,
  isImageUrl,
  hideActions = false,
}: Readonly<WorkExperienceCardProps>) {
  const promosSorted = (e.promotions ?? [])
    .filter((p) => p?.jobTitle)
    .sort((a, b) => (Date.parse(a.startDate ?? '') || 0) - (Date.parse(b.startDate ?? '') || 0));

  // Build full career timeline: initial role (from main job) + promotions
  const timelineEntries: Array<{
    jobTitle?: string;
    startDate?: string;
    mediaItems?: MediaItem[];
  }> = [];
  if (e.jobTitle) {
    timelineEntries.push({
      jobTitle: e.jobTitle,
      startDate: e.startDate,
      mediaItems: mediaItemsOf(e),
    });
  }
  for (const p of promosSorted) {
    timelineEntries.push({
      jobTitle: p.jobTitle,
      startDate: p.startDate,
      mediaItems: mediaItemsOf(p),
    });
  }

  const latestTitle = timelineEntries.at(-1)?.jobTitle ?? e.jobTitle ?? 'Role';

  // One badge per image: flatten to { label, item } so each card = one badge + one image
  const mainMedia = mediaItemsOf(e);
  const artifactCards: { label: string; item: MediaItem }[] = [];
  mainMedia.forEach((item) => artifactCards.push({ label: 'Initial role', item }));
  (e.promotions ?? []).forEach((p, idx) => {
    const items = mediaItemsOf(p);
    items.forEach((item) => artifactCards.push({ label: `Promotion_${idx + 1}`, item }));
  });
  const hasAnyArtifacts = artifactCards.length > 0;
  const [isBriefExpanded, setIsBriefExpanded] = useState(false);

  // workId comes from DB (backend auto-generates on save); fallback to index+1 for legacy entries
  const rawId = (e.workId ?? '').trim() || String(index + 1);
  const numId = Number.parseInt(rawId, 10);
  const displayWorkId = Number.isNaN(numId) ? rawId : String(numId).padStart(2, '0');

  return (
    <div className="group relative ss-settings-card ss-settings-card--work">
      {/* Industrial Hardware Frame */}
      <div className="ss-card-border relative border-[3px] border-border bg-card">
        
        {/* Hardware Corner Brackets */}
        <div className="absolute -top-[3px] -left-[3px] size-4 border-t-[3px] border-l-[3px] border-primary z-20" />
        <div className="absolute -bottom-[3px] -right-[3px] size-4 border-b-[3px] border-r-[3px] border-primary z-20" />

        {/* Technical Header */}
        <div className="ss-card-header flex items-center justify-between border-b-[3px] border-border bg-muted/30 px-4 py-2 relative z-10">
          <div className="flex items-center gap-3">
            <Fingerprint className="size-3.5 text-primary" />
            <span className="text-[10px] font-black font-mono tracking-widest text-foreground">
              WORK_ID: <span className="text-primary">#{displayWorkId}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
           
            {e.currentPosition ? (
              <>
                <Activity className="size-3 text-emerald-500 animate-pulse" />
                <span className="text-[9px] font-mono font-bold text-emerald-500/80 uppercase tracking-tighter">
                  ACTIVE_ENGAGEMENT
                </span>
              </>
            ) : (
              <span className="text-[9px] font-mono font-bold text-muted-foreground/50 uppercase tracking-tighter">
                PAST
              </span>
            )}
          </div>
        </div>

        {/* Main Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 relative z-10">
          
          {/* Left Column: Core Details */}
          <div className="lg:col-span-8 p-5 space-y-6 border-r-0 lg:border-r-[3px] border-border">
            
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Logo Display Screen — dot pattern is box background so logo/icon always on top */}
                <div className="ss-card-logo-box ss-card-logo-box--work relative size-16 shrink-0 border-2 border-border flex items-center justify-center overflow-hidden">
                  {e.companyLogo ? (
                    <img
                      src={e.companyLogo}
                      alt=""
                      className="ss-card-logo-img size-full object-contain p-2"
                    />
                  ) : (
                    <Building2 className="size-7 text-muted-foreground/30 shrink-0" />
                  )}
                </div>
                <div>
                  <h4 className="ss-card-title text-xl font-black uppercase tracking-tighter text-foreground leading-none">
                    {latestTitle}
                  </h4>
                  <p className="mt-1 text-xs font-mono font-bold text-primary uppercase">
                    {e.company || 'UNKNOWN_ORG'}
                  </p>
                </div>
              </div>

              {/* Action Group */}
              {!hideActions && (
                <div className="flex gap-2 self-end sm:self-start">
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

            {/* Metadata Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/40 border border-border text-[9px] font-mono font-bold uppercase text-muted-foreground">
                <Calendar className="size-3 text-primary" />
                {formatMonthYear(e.startDate ?? '')} — {e.currentPosition ? 'PRESENT' : formatMonthYear(e.endDate ?? '')}
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/40 border border-border text-[9px] font-mono font-bold uppercase text-muted-foreground">
                <MapPin className="size-3 text-primary" />
                {e.location ? locationWithoutType(e.location) : 'N/A'} {e.locationType ? `[${e.locationType}]` : ''}
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/40 border border-border text-[9px] font-mono font-bold uppercase text-muted-foreground">
                <Clock className="size-3 text-primary" />
                TYPE: {e.employmentType || 'FULL_TIME'}
              </div>
              {e.companyDomain && (
                <HoverCard
                  content={<LinkPreviewCardContent domain={e.companyDomain} />}
                  side="top"
                  align="start"
                  contentClassName="w-[280px] p-0 border-2 border-primary"
                >
                  <a
                    href={normalizeDomain(e.companyDomain)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ss-link-pill flex items-center gap-2 px-2 py-1.5 bg-primary/5 border border-primary/20 text-[9px] font-mono font-bold text-primary uppercase truncate"
                  >
                    <Globe className="size-3" />
                    {String(e.companyDomain).replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                  </a>
                </HoverCard>
              )}
            </div>

            {/* Position Summary: click description box to expand and show scroll */}
            {e.description?.trim() && (
              <div className="relative border-2 border-dashed border-border bg-muted/5">
                <button
                  type="button"
                  onClick={() => setIsBriefExpanded((v) => !v)}
                  className="absolute -top-[11px] left-3 bg-card px-2 text-[8px] font-black uppercase text-primary tracking-widest border border-primary/20 z-10 cursor-pointer hover:bg-primary/5"
                  aria-expanded={isBriefExpanded}
                  aria-label={isBriefExpanded ? 'Collapse description' : 'Expand description'}
                >
                  POSITION_BRIEF.RAW
                </button>
                <button
                  type="button"
                  onClick={(ev) => {
                    const t = ev.target;
                    const el = t instanceof Element ? t : (t as Node).parentElement;
                    if (el?.closest('[data-ss-brief-scroll]')) return;
                    setIsBriefExpanded((v) => !v);
                  }}
                  className={cn(
                    'w-full text-left p-4 pt-5 cursor-pointer block',
                    isBriefExpanded && 'overflow-hidden'
                  )}
                  aria-expanded={isBriefExpanded}
                  aria-label={isBriefExpanded ? 'Collapse description' : 'Expand to read full description'}
                >
                  {isBriefExpanded ? (
                    <div className="max-h-[180px] overflow-y-auto pr-1" data-ss-brief-scroll>
                      <p className="text-[11px] font-medium leading-relaxed text-muted-foreground whitespace-pre-wrap italic">
                        &quot;{e.description.trim()}&quot;
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] font-medium leading-relaxed text-muted-foreground whitespace-pre-wrap italic line-clamp-7">
                      &quot;{e.description.trim()}&quot;
                    </p>
                  )}
                </button>
              </div>
            )}

            {/* Promotions / Career timeline rail (more prominent UI) */}
            {timelineEntries.length > 1 && (
              <div className="mt-3 space-y-3 rounded-sm border border-border/40 bg-muted/10 p-3">
                <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="size-3.5 text-primary" /> Career Progression Path
                </h5>
                <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                  {timelineEntries.map((p, pidx) => (
                    <div
                      key={JSON.stringify([p.jobTitle, p.startDate])}
                      className="relative pl-4 before:absolute before:left-0 before:top-1/2 before:w-3 before:h-[1px] before:bg-primary/30"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground">
                        <span className="font-bold uppercase text-foreground">
                          {p.jobTitle ?? (pidx === 0 ? 'Initial role' : `Promotion ${pidx}`)}
                        </span>
                        <span className="text-[9px] uppercase text-primary">
                          {formatMonthYear(p.startDate ?? '')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Skills & Media — artifact area stretches to base of Career Progression Path */}
          <div className="lg:col-span-4 bg-muted/10 p-5 flex flex-col gap-6 min-h-0">
            {/* Tech Stack Matrix */}
            <div className="space-y-4 shrink-0">
              <h5 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-1">
                Tech_Stack_Used
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set((e.skills ?? []).map(String))].map((s) => (
                  <div
                    key={s}
                    className="ss-meta-pill px-2 py-0.5 border border-border bg-card text-[9px] font-mono font-bold text-muted-foreground"
                  >
                    {s.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            {/* Verified_Artifacts: one badge + one image per card, or empty state */}
            <div className="flex flex-col min-h-0 flex-1">
              <h5 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b border-border pb-1 shrink-0">
                Verified_Artifacts
              </h5>
              {hasAnyArtifacts ? (
                <div className="overflow-y-auto min-h-0 flex-1 pr-1 grid grid-cols-2 gap-3 content-start">
                  {artifactCards.map(({ label, item: m }) => {
                    const isImage = isImageUrl(m.url);
                    return (
                      <div
                        key={`${label}:${m.url}`}
                        className="flex min-w-0 flex-col gap-1.5 rounded border border-border/60 bg-card/50 p-2 overflow-hidden"
                      >
                        <span className="shrink-0 w-full px-2 py-0.5 border border-primary/50 bg-primary/10 text-[9px] font-mono font-black uppercase tracking-wider text-primary text-center truncate">
                          {label}
                        </span>
                        {isImage ? (
                          <button
                            type="button"
                            onClick={() => onPreviewMedia(m)}
                            className="ss-media-thumb group/media relative aspect-square w-full border-2 border-border bg-background overflow-hidden"
                          >
                            <img src={m.url} alt={m.altText ?? ''} className="size-full object-cover" />
                          </button>
                        ) : (
                          (() => {
                            const href = m.url;
                            let domain = href;
                            try {
                              domain = new URL(href).hostname;
                            } catch {
                              /* leave as is */
                            }
                            return (
                              <HoverCard
                                content={<LinkPreviewCardContent domain={domain} title={m.title} />}
                                side="top"
                                align="start"
                                contentClassName="w-[280px] p-0 border-2 border-primary"
                              >
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ss-link-pill flex items-center justify-center gap-1.5 px-2 py-1.5 border-2 border-border bg-background text-[9px] font-mono font-bold text-primary truncate hover:bg-primary/10 w-full min-w-0"
                                >
                                  <Link2 className="size-4 text-muted-foreground/50 shrink-0" />
                                  <span className="truncate">{m.title || domain}</span>
                                </a>
                              </HoverCard>
                            );
                          })()
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 py-6 px-4 border-2 border-dashed border-border/60 rounded bg-muted/5">
                  <ImageOff className="size-10 text-muted-foreground/40" aria-hidden />
                  <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground/70 text-center">
                    No image uploaded or documents
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Technical Deco */}
        <div className="border-t-[3px] border-border bg-muted/20 px-4 py-1.5 flex justify-between items-center">
          <div className="flex gap-1.5 items-center">
            <div className="flex gap-1">
              {(['deco-0', 'deco-1', 'deco-2', 'deco-3', 'deco-4', 'deco-5'] as const).map((decoId, i) => (
                <div
                  key={decoId}
                  className={cn('h-2.5 w-[1px] bg-foreground/20', i % 2 === 0 && 'w-[2px]')}
                />
              ))}
            </div>
            <span className="text-[8px] font-mono font-bold text-muted-foreground/40 tracking-[0.2em] uppercase">
              Position_Hash_Verified
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold text-muted-foreground/30">
            RECORD_TYPE: EXPERIENTIAL_LOG
          </span>
        </div>
      </div>
    </div>
  );
}