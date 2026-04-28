'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Award, Calendar, Code2, ExternalLink, Pencil, Trash2, ShieldCheck, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HoverCard } from '@/components/ui/HoverCard';
import { LinkPreviewCardContent } from '@/components/ui/LinkPreviewCardContent';

type MediaItem = { url: string; title?: string };

const CERT_CARD_FOOTER_MARKS = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'] as const;

type CertificationCardProps = Readonly<{
  cert: any;
  index: number;
  saving: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onPreviewMedia: (item: MediaItem) => void;
  formatMonthYear: (value: string) => string;
  domainFromUrl: (value: string) => string;
  isImageUrl: (url: string) => boolean;
  hideActions?: boolean;
}>;

export function CertificationCard({
  cert: e,
  index,
  saving,
  onEdit,
  onRemove,
  onPreviewMedia,
  formatMonthYear,
  domainFromUrl,
  isImageUrl,
  hideActions = false,
}: CertificationCardProps) {
  const issueStr = formatMonthYear(e.issueDate ?? '');
  const expStr = e.expirationDate ? formatMonthYear(e.expirationDate) : null;
  const rawId = (e.certId ?? '').trim() || String(index + 1);
  const numId = Number.parseInt(rawId, 10);
  const displayCertId = Number.isNaN(numId) ? rawId : String(numId).padStart(2, '0');
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const descRef = useRef<HTMLDivElement>(null);

  const skills = e.skills ?? [];
  const skillsToShow = 3;
  const visibleSkills = skillsExpanded ? skills : skills.slice(0, skillsToShow);
  const remainingCount = skills.length - skillsToShow;

  useEffect(() => {
    if (!isDescExpanded) return;
    const handleClickOutside = (ev: MouseEvent) => {
      if (descRef.current && !descRef.current.contains(ev.target as Node)) {
        setIsDescExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDescExpanded]);

  return (
    <div className="group relative ss-settings-card">
      {/* Industrial Frame - Fixed Position */}
      <div className="ss-card-border relative border-[3px] border-border bg-card">
        
        {/* Hardware Corner Brackets */}
        <div className="absolute -top-[3px] -left-[3px] size-4 border-t-[3px] border-l-[3px] border-primary z-10" />
        <div className="absolute -bottom-[3px] -right-[3px] size-4 border-b-[3px] border-r-[3px] border-primary z-10" />

        {/* Scanline Effect on Hover */}
        <div className="ss-scanline-overlay absolute inset-0 pointer-events-none overflow-hidden opacity-0 z-0">
          <div className="ss-scanline-line w-full h-[1px] bg-primary/20 absolute top-0 left-0" />
        </div>

        {/* Technical Header — reduced padding */}
        <div className="ss-card-header flex items-center justify-between border-b-[3px] border-border bg-muted/30 px-3 py-1.5 relative z-10">
          <div className="flex items-center gap-3">
            <Fingerprint className="size-3.5 text-primary" />
            <span className="text-[10px] font-black font-mono tracking-widest text-foreground">
              CERT_ID: <span className="text-primary">#{displayCertId}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3 text-primary/60" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-tighter text-muted-foreground/60">
              {e.certValType ? `CERT_VAL_TYPE: ${e.certValType}` : 'VERIFIED_CREDENTIAL'}
            </span>
          </div>
        </div>

        {/* Main Interface Content */}
        <div className="p-3 flex flex-col md:flex-row gap-4 relative z-10">
          
          {/* Issuer Logo Display Screen — reduced size */}
          <div className="ss-card-logo-box relative size-12 shrink-0 border-2 border-border bg-background flex items-center justify-center overflow-hidden">
            {/* CRT Grid Effect */}
            <div className="absolute inset-0 opacity-[0.1] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:4px_4px]" />
            
            {e.issuerLogo ? (
              <img
                src={e.issuerLogo}
                alt={e.issuerLogoAlt?.trim() || (e.issuingOrganization ? `${e.issuingOrganization} logo` : 'Issuer logo')}
                title={e.issuerLogoAlt?.trim() || undefined}
                className="ss-card-logo-img size-full object-contain p-1 grayscale brightness-90 relative z-10"
                onError={(ev) => {
                  (ev.target as HTMLImageElement).style.display = 'none';
                  ev.currentTarget.parentElement?.querySelector('.cert-logo-fallback')?.classList.remove('hidden');
                }}
              />
            ) : null}
            <span className={cn('cert-logo-fallback text-muted-foreground/30', e.issuerLogo && 'hidden')}>
              <Award className="size-5" />
            </span>
          </div>

          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="ss-card-title text-base font-black uppercase tracking-tighter text-foreground leading-tight truncate">
                  {e.name || 'UNNAMED_CERTIFICATION'}
                </h4>
                <div className="mt-1 flex items-center gap-2 min-w-0">
                  <div className="size-1.5 shrink-0 rounded-full bg-primary" />
                  <p className="text-[10px] font-mono font-bold text-foreground tracking-tight uppercase truncate">
                    {e.issuingOrganization || 'UNKNOWN_ISSUER'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {!hideActions && (
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={onEdit}
                    className="ss-btn-action size-8 flex items-center justify-center border-2 border-border bg-card"
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

            {/* Technical Metadata + Skills/Tags on same row */}
            <div className="flex flex-wrap items-center gap-1.5">
              {issueStr && (
                <div className="px-2 py-1 bg-muted border border-border text-[9px] font-mono font-bold flex items-center gap-2 uppercase">
                  <Calendar className="size-3 text-primary" />
                  Issued: {issueStr}
                </div>
              )}
              {expStr && (
                <div className="px-2 py-1 border border-border text-[9px] font-mono font-bold text-muted-foreground uppercase">
                  Expires: {expStr}
                </div>
              )}
              {e.credentialId && (
                <div className="px-2 py-1 bg-primary text-primary-foreground text-[9px] font-mono font-bold uppercase tracking-tighter">
                  REF: {e.credentialId}
                </div>
              )}
              {e.credentialUrl && (
                <HoverCard
                  content={<LinkPreviewCardContent domain={domainFromUrl(e.credentialUrl)} />}
                  side="top"
                  align="start"
                  contentClassName="w-[280px] p-0"
                >
                  <a
                    href={e.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ss-link-pill px-2 py-1 border border-primary/30 text-[9px] font-mono font-bold text-primary flex items-center gap-2"
                  >
                    <ExternalLink className="size-3" />
                    VERIFY_LINK
                  </a>
                </HoverCard>
              )}
              {e.skills && e.skills.length > 0 && (
                <>
                  {visibleSkills.map((s: string) => (
                    <span
                      key={`${displayCertId}-skill-${s}`}
                      className="ss-meta-pill inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted/40 border border-border text-[9px] font-mono font-bold text-muted-foreground"
                    >
                      <Code2 className="size-2.5 text-primary/60" /> {s.toUpperCase()}
                    </span>
                  ))}
                  {!skillsExpanded && remainingCount > 0 && (
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); setSkillsExpanded(true); }}
                      className="ss-meta-pill inline-flex items-center gap-1 px-2 py-0.5 bg-muted/60 border border-border text-[9px] font-mono font-bold text-primary hover:bg-muted/80 transition-colors"
                      aria-label={`Show ${remainingCount} more skills`}
                    >
                      +{remainingCount} ⋯
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Description — two lines when collapsed; click outside to collapse */}
            {e.description && (
              <div ref={descRef} className="bg-muted/20 border-l-2 border-primary/30 min-w-0 overflow-hidden flex flex-col pl-5">
                <button
                  type="button"
                  onClick={(ev) => {
                    if ((ev.target as HTMLElement).closest('.ss-card-desc-scroll')) return;
                    setIsDescExpanded((v: boolean) => !v);
                  }}
                  className="text-left w-full cursor-pointer flex flex-col overflow-hidden min-h-0"
                  aria-expanded={isDescExpanded}
                  aria-label={isDescExpanded ? 'Collapse description' : 'Expand to read full description'}
                >
                  {isDescExpanded ? (
                    <div
                      className="ss-card-desc-scroll min-h-0 overflow-y-auto pr-1.5 py-2 max-h-[4.5rem] leading-snug"
                      style={{ scrollbarGutter: 'stable' }}
                    >
                      <p className="text-[11px] font-medium text-muted-foreground break-words">
                        <span className="text-primary font-bold mr-2">SUMMARY_LOG:</span>
                        <span className="break-words">{e.description}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] font-medium text-muted-foreground leading-snug break-words line-clamp-2 [line-height:1.375rem] py-1.5">
                      <span className="text-primary font-bold mr-2">SUMMARY_LOG:</span>
                      <span className="break-words">{e.description}</span>
                    </p>
                  )}
                </button>
              </div>
            )}

            {/* Media Thumbnails */}
            {e.mediaItems && e.mediaItems.length > 0 && (
              <div className="pt-1 space-y-1.5">
                <p className="text-[8px] font-black uppercase text-muted-foreground tracking-[0.2em]">Attached_Media</p>
                <div className="flex flex-wrap gap-1.5">
                  {e.mediaItems.slice(0, 3).map((m: MediaItem) => (
                    <button
                      key={`${displayCertId}-media-${m.url}`}
                      type="button"
                      onClick={() => onPreviewMedia(m)}
                      className="ss-cert-media-wrap size-8 border-2 border-border bg-background overflow-hidden flex items-center justify-center relative"
                    >
                      <div className="ss-overlay absolute inset-0 bg-primary/5 opacity-0 z-10" />
                      {isImageUrl(m.url) ? (
                        <img src={m.url} alt={m.title?.trim() || ''} className="size-full object-cover grayscale" />
                      ) : (
                        <Award className="size-3.5 text-muted-foreground" />
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
          <div className="flex gap-1 opacity-30">
            {CERT_CARD_FOOTER_MARKS.map((mark, i) => (
              <div key={mark} className={cn('h-2 w-[1px] bg-foreground', i % 2 === 0 && 'w-[3px]')} />
            ))}
          </div>
          <span className="text-[9px] font-mono font-bold text-muted-foreground/40 tracking-[0.2em]">
            CERT_VAL_TYPE: A-01
          </span>
        </div>
      </div>
    </div>
  );
}