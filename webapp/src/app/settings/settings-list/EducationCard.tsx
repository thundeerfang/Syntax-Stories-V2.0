'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Calendar, GraduationCap, Pencil, Sigma, Tag, Trash2, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

const EDU_CARD_FOOTER_MARKS = ['e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] as const;

type EducationCardProps = Readonly<{
  education: any;
  index: number;
  saving: boolean;
  onEdit: () => void;
  onRemove: () => void;
  formatMonthYear: (value: string) => string;
  hideActions?: boolean;
}>;

export function EducationCard({
  education: e,
  index,
  saving,
  onEdit,
  onRemove,
  formatMonthYear,
  hideActions = false,
}: EducationCardProps) {
  const dateRange = [
    formatMonthYear(e.startDate ?? ''),
    e.currentEducation ? 'STILL_ACTIVE' : formatMonthYear(e.endDate ?? ''),
  ]
    .filter(Boolean)
    .join(' >> ');

  const rawId = (e.eduId ?? '').trim() || String(index + 1);
  const numId = Number.parseInt(rawId, 10);
  const displayEduId = Number.isNaN(numId) ? rawId : String(numId).padStart(2, '0');
  const isActive = !!e.currentEducation;
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  const tags: Array<{ key: string; node: React.ReactNode }> = [
    dateRange
      ? {
          key: 'dateRange',
          node: (
            <div className="px-2 py-1 bg-muted border border-border text-[9px] font-mono font-bold flex items-center gap-2 uppercase">
              <Calendar className="size-3 text-primary" />
              {dateRange}
            </div>
          ),
        }
      : null,
    e.fieldOfStudy
      ? {
          key: 'fieldOfStudy',
          node: (
            <div className="ss-meta-pill px-2 py-1 border border-border text-[9px] font-mono font-bold text-muted-foreground flex items-center gap-2 uppercase">
              <Tag className="size-3" />
              FIELD: {e.fieldOfStudy}
            </div>
          ),
        }
      : null,
    e.refCode
      ? {
          key: 'refCode',
          node: (
            <div className="ss-meta-pill px-2 py-1 border border-border text-[9px] font-mono font-bold text-muted-foreground flex items-center gap-2 uppercase">
              <Sigma className="size-3" />
              REF_CODE: {e.refCode}
            </div>
          ),
        }
      : null,
    e.grade
      ? {
          key: 'grade',
          node: (
            <div className="px-2 py-1 bg-primary text-primary-foreground text-[9px] font-mono font-bold uppercase">
              Grade: {e.grade}
            </div>
          ),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; node: React.ReactNode }>;

  const tagsToShow = 3;
  const visibleTags = tagsExpanded ? tags : tags.slice(0, tagsToShow);
  const remainingTagCount = tags.length - tagsToShow;

  useEffect(() => {
    if (!isInfoExpanded) return;
    const handleClickOutside = (ev: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(ev.target as Node)) {
        setIsInfoExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isInfoExpanded]);

  return (
    <div className="group relative ss-settings-card">
      {/* Fixed Industrial Frame (No Translate/Uplift) */}
      <div className="ss-card-border relative border-[3px] border-border bg-card">
        
        {/* Hardware Corner Brackets */}
        <div className="absolute -top-[3px] -left-[3px] size-4 border-t-[3px] border-l-[3px] border-primary z-10" />
        <div className="absolute -bottom-[3px] -right-[3px] size-4 border-b-[3px] border-r-[3px] border-primary z-10" />

        {/* Simplified Header: EDU_ID focus */}
        <div className="ss-card-header flex items-center justify-between border-b-[3px] border-border bg-muted/30 px-3 py-1.5 relative z-10">
          <div className="flex items-center gap-3">
            <Cpu className="size-3.5 text-primary" />
            <span className="text-[10px] font-black font-mono tracking-widest text-foreground">
              EDU_ID: <span className="text-primary">#{displayEduId}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[9px] font-mono font-bold uppercase tracking-tighter',
                isActive ? 'text-emerald-500' : 'text-muted-foreground/60'
              )}
            >
              {isActive ? 'ACTIVE' : 'COMPLETED'}
            </span>
          </div>
        </div>

        {/* Main Interface Content */}
        <div className="p-3 flex flex-col md:flex-row gap-4 relative z-10">
          
          {/* Logo Display Screen — reduced size */}
          <div className="ss-card-logo-box relative size-12 shrink-0 border-2 border-border bg-background flex items-center justify-center overflow-hidden">
            {/* Retro CRT Grid Effect */}
            <div className="absolute inset-0 opacity-[0.1] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:4px_4px]" />
            
            {e.schoolLogo ? (
              <img
                src={e.schoolLogo}
                alt={e.schoolLogoAlt?.trim() || e.school || 'School logo'}
                title={e.schoolLogoAlt?.trim() || undefined}
                className="ss-card-logo-img-bright size-full object-contain p-1 grayscale brightness-90 relative z-10"
              />
            ) : (
              <GraduationCap className="size-5 text-muted-foreground/30" />
            )}
          </div>

          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="ss-card-title text-base font-black uppercase tracking-tighter text-foreground leading-tight truncate">
                  {e.degree || 'NULL_CREDENTIAL'}
                </h4>
                <div className="mt-1 flex items-center gap-2 min-w-0">
                  <div className="size-1.5 shrink-0 rounded-full bg-primary" />
                  <p className="text-[10px] font-mono font-bold text-foreground tracking-tight uppercase truncate">
                    {e.school || 'NOT_SPECIFIED'}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Standard Retro Style */}
              {!hideActions && (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={onEdit}
                    className="ss-btn-action size-8 flex items-center justify-center border-2 border-border bg-card active:bg-primary/80"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onRemove}
                    disabled={saving}
                    className="ss-btn-remove size-8 flex items-center justify-center border-2 border-border bg-card disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Technical Data Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleTags.map((t) => (
                <React.Fragment key={t.key}>{t.node}</React.Fragment>
              ))}
              {!tagsExpanded && remainingTagCount > 0 && (
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setTagsExpanded(true);
                  }}
                  className="ss-meta-pill inline-flex items-center gap-1 px-2 py-0.5 bg-muted/60 border border-border text-[9px] font-mono font-bold text-primary hover:bg-muted/80 transition-colors"
                  aria-label={`Show ${remainingTagCount} more tags`}
                >
                  +{remainingTagCount} ⋯
                </button>
              )}
            </div>

            {e.activity && (
              <div ref={infoRef} className="bg-muted/20 border-l-2 border-primary/30 min-w-0 overflow-hidden flex flex-col pl-5">
                <button
                  type="button"
                  onClick={(ev) => {
                    if ((ev.target as HTMLElement).closest('.ss-card-desc-scroll')) return;
                    setIsInfoExpanded((v) => !v);
                  }}
                  className="text-left w-full cursor-pointer flex flex-col overflow-hidden min-h-0"
                  aria-expanded={isInfoExpanded}
                  aria-label={isInfoExpanded ? 'Collapse info' : 'Expand to read full info'}
                >
                  {isInfoExpanded ? (
                    <div
                      className="ss-card-desc-scroll min-h-0 overflow-y-auto pr-1.5 py-2 max-h-[4.5rem] leading-snug"
                      style={{ scrollbarGutter: 'stable' }}
                    >
                      <p className="text-[11px] font-medium text-muted-foreground break-words">
                        <span className="text-primary font-bold mr-2">INFO:</span>
                        <span className="break-words">{e.activity}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] font-medium text-muted-foreground leading-snug break-words line-clamp-2 [line-height:1.375rem] py-1.5">
                      <span className="text-primary font-bold mr-2">INFO:</span>
                      <span className="break-words">{e.activity}</span>
                    </p>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Serial Number & Static Barcode Deco */}
        <div className="border-t-2 border-border bg-muted/10 px-3 py-1 flex justify-between items-center">
          <div className="flex gap-1 opacity-30">
            {EDU_CARD_FOOTER_MARKS.map((mark, i) => (
              <div key={mark} className={cn('h-2 w-[1px] bg-foreground', i % 3 === 0 && 'w-[2px]')} />
            ))}
          </div>
          <span className="text-[9px] font-mono font-bold text-muted-foreground/40 tracking-[0.2em]">
            REF_CODE: {index + 2024}_EDU_DOC
          </span>
        </div>
      </div>
    </div>
  );
}