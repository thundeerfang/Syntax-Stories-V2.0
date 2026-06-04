'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Link2, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { settingsBtnBlockPrimarySm } from '@/app/settings/buttonStyles';
import { uploadMedia } from '@/api/upload';
import { HoverCard } from '@/components/ui/popover';
import { LinkPreviewCardContent } from '@/components/ui/popover';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/retroui';
import { buildLocationString } from '@/lib/profile/profileLocation';
import { monthYearToValue, profileYearOptions } from '@/lib/profile/dateLabels';

export type MediaItem = {
  url: string;
  title?: string;
  /** When true, this media item only exists locally and must be uploaded on Save. */
  isPending?: boolean;
  pendingFile?: File;
  /** When set with staged `pendingFile`, passed to `uploadMedia` for server-side crop (legacy). */
  pendingCrop?: import('@/api/upload').CropArea;
};

/** Resolve staged uploads (blob + pending file) to final URLs before profile PATCH. */
export async function resolveProfileMediaItems(
  token: string | null | undefined,
  items: MediaItem[]
): Promise<{ url: string; title?: string }[]> {
  const out: { url: string; title?: string }[] = [];
  for (const m of items.slice(0, 5)) {
    if (m.isPending && m.pendingFile) {
      if (!token) throw new Error('Sign in again to finish uploading staged media.');
      const data = await uploadMedia(token, m.pendingFile, m.pendingCrop, () => {});
      if (!data.url) throw new Error('Media upload failed.');
      out.push({ url: data.url.trim(), title: m.title?.trim() || undefined });
    } else if (m.url.trim() && !m.url.startsWith('blob:')) {
      out.push({ url: m.url.trim(), title: m.title?.trim() || undefined });
    }
  }
  return out.slice(0, 5);
}

/** Normalize link input: full http(s) URLs, or bare domains / www… → https://… */
export function normalizeMediaLinkInput(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const candidates = /^https?:\/\//i.test(t) ? [t] : [t, `https://${t.replace(/^\/+/, '')}`];
  for (const c of candidates) {
    try {
      const u = new URL(c);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        if (u.hostname) return u.href;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Non-empty lines from a textarea; each normalized to a URL. */
export function parseMediaLinkLineInput(block: string): {
  urls: string[];
  skippedNonEmpty: number;
} {
  const lines = block.split(/\r?\n/);
  const urls: string[] = [];
  let skippedNonEmpty = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const u = normalizeMediaLinkInput(trimmed);
    if (u) urls.push(u);
    else skippedNonEmpty += 1;
  }
  return { urls, skippedNonEmpty };
}

export interface AddMediaLinksDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with already-normalized URL items; caller is responsible for enforcing overall max 5 constraint. */
  onAdd: (items: MediaItem[]) => void;
  /** How many more media items can be added before hitting the 5-item cap. */
  maxCount: number;
}

export function AddMediaLinksDialog({
  open,
  onClose,
  onAdd,
  maxCount,
}: Readonly<AddMediaLinksDialogProps>) {
  const [linkUrl, setLinkUrl] = useState('');
  const [title, setTitle] = useState('');

  const handleClose = () => {
    setLinkUrl('');
    setTitle('');
    onClose();
  };

  const handleAdd = () => {
    const room = Math.max(0, maxCount);
    if (room <= 0) {
      toast.error('You already have 5 media items for this entry.', { id: 'syntax-max-media' });
      return;
    }
    const normalized = normalizeMediaLinkInput(linkUrl);
    if (!normalized) {
      toast.error('Enter a valid URL (https://… or domain.com).', { id: 'syntax-invalid-url' });
      return;
    }
    const explicit = title.trim();
    const inferred = !explicit ? domainFromUrl(normalized) || 'Link' : undefined;
    const effectiveTitle = explicit || inferred || 'Link';
    const items: MediaItem[] = [{ url: normalized, title: effectiveTitle }];

    onAdd(items);

    setLinkUrl('');
    setTitle('');
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      titleId="add-media-links-title"
      showCloseButton={false}
      panelClassName={cn(
        'pointer-events-auto w-full max-w-lg max-h-[90vh] overflow-y-auto',
        'border-4 border-border bg-card shadow'
      )}
      contentClassName="relative p-6 sm:p-8"
      backdropClassName="fixed inset-0 z-[101] bg-black/40"
    >
      <div className="flex flex-col gap-4">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 flex flex-col gap-1.5">
            <h2
              id="add-media-links-title"
              className="text-sm font-black uppercase tracking-widest flex flex-wrap items-center gap-2"
            >
              <Link2 className="size-4 shrink-0 text-primary" aria-hidden />
              <span>Add media link(s)</span>
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              One URL per line. Links share the 5-item limit with uploaded images.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 flex size-9 items-center justify-center border-2 border-border bg-card text-muted-foreground shadow transition-colors hover:text-foreground hover:border-primary"
            aria-label="Close"
          >
            <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
          </button>
        </header>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase">Link URL</Label>
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="text-sm"
              autoComplete="off"
              type="url"
            />
            <p className="text-[9px] text-muted-foreground">
              Remaining media slots for this entry: {Math.max(0, maxCount)} (links + images).
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase">Title (optional)</Label>
            <Input
              placeholder="Used as the link’s title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
              maxLength={120}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 text-[10px] font-bold uppercase border border-border text-muted-foreground hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className={cn(
              settingsBtnBlockPrimarySm,
              'px-3 py-1.5 text-[10px] font-bold',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
            disabled={maxCount <= 0 || !linkUrl.trim()}
          >
            Add link
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
}

export function domainFromUrl(url: string): string {
  const u = (url ?? '').trim();
  if (!u) return '';
  try {
    const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    return new URL(withProto).host;
  } catch {
    return u.replace(/^https?:\/\//i, '').split('/')[0] || u;
  }
}

/** Inline media thumbnail for list rows (thumbnail + label beside, no wrap). */
export function MediaThumbnailRow({
  item,
  onRemove,
  onPreview,
}: {
  item: MediaItem;
  onRemove?: () => void;
  onPreview?: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  if (!item || !item.url) return null;
  const fallbackText = item.title || 'Image';
  const isImage = isImageUrl(item.url);
  const linkDomain = !isImage ? domainFromUrl(item.url) : '';

  return (
    <li className="flex items-center gap-2 p-2 border-2 border-border bg-muted/20">
      {isImage && !imgError ? (
        <button
          type="button"
          onClick={onPreview}
          className="size-12 border-2 border-border shrink-0 overflow-hidden focus:ring-2 focus:ring-primary"
        >
          <img
            src={item.url}
            alt={item.title ?? ''}
            className="size-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              setImgError(true);
            }}
          />
        </button>
      ) : isImage && imgError ? (
        <div className="size-12 border-2 border-border bg-muted/30 shrink-0 flex items-center justify-center p-1">
          <span
            className="text-[9px] font-bold text-muted-foreground text-center leading-tight line-clamp-2"
            title={fallbackText}
          >
            {fallbackText}
          </span>
        </div>
      ) : (
        <HoverCard
          content={<LinkPreviewCardContent domain={linkDomain || item.url} title={item.title} />}
          side="top"
          align="start"
          contentClassName="w-[280px] p-0"
        >
          <div className="size-12 border-2 border-border bg-muted flex items-center justify-center shrink-0">
            <Link2 className="size-5 text-muted-foreground" />
          </div>
        </HoverCard>
      )}
      <div className="min-w-0 flex-1">
        {item.title && <p className="text-xs font-bold truncate">{item.title}</p>}
        <p className="text-[10px] text-muted-foreground truncate">{item.url}</p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-2 border-2 border-border hover:bg-muted shrink-0"
          aria-label="Remove media"
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </button>
      )}
    </li>
  );
}

export type PromotionForm = {
  jobTitle: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  currentPosition: boolean;
  mediaItems: MediaItem[];
};

export type WorkExpForm = {
  jobTitle: string;
  employmentType: string;
  company: string;
  companyDomain: string;
  companyLogo: string;
  companyLogoAlt: string;
  currentPosition: boolean;
  startDate: string;
  endDate: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  location: string;
  locationType: string;
  locationCountry: string;
  locationState: string;
  locationCity: string;
  description: string;
  skills: string[];
  /** Promotions at the same company (timeline: initial role then 1, 2, 3...). */
  promotions: PromotionForm[];
  mediaItems: MediaItem[];
};

export const PROMOTION_DEFAULT: PromotionForm = {
  jobTitle: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  currentPosition: false,
  mediaItems: [],
};

export const WORK_EXP_DEFAULT: WorkExpForm = {
  jobTitle: '',
  employmentType: '',
  company: '',
  companyDomain: '',
  companyLogo: '',
  companyLogoAlt: '',
  currentPosition: false,
  startDate: '',
  endDate: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  location: '',
  locationType: '',
  locationCountry: '',
  locationState: '',
  locationCity: '',
  description: '',
  skills: [],
  promotions: [],
  mediaItems: [],
};

export const START_YEAR = 1980;
export const END_YEAR = new Date().getFullYear();
export const YEAR_OPTIONS = profileYearOptions(END_YEAR);

/** Strip all work arrangement parts like "(On-site)" or "(Remote)" from location string (handles duplicated/legacy data). */
export function locationWithoutType(location: string | undefined): string {
  if (!location?.trim()) return '';
  return location
    .trim()
    .replace(/\s*\([^)]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize domain for display and iframe (add https if missing). */
export function normalizeDomain(domain: string | undefined): string {
  if (!domain?.trim()) return '';
  const d = domain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
  return d ? `https://${d}` : '';
}

export type WorkExpFilledPromo = { p: PromotionForm; idx: number };

export function getFilledWorkExpPromotions(form: WorkExpForm): WorkExpFilledPromo[] {
  return form.promotions.map((p, idx) => ({ p, idx })).filter(({ p }) => p.jobTitle.trim());
}

export function collectWorkExpRequiredFieldErrors(
  form: WorkExpForm,
  startDateVal: string
): Record<string, string> {
  const err: Record<string, string> = {};
  if (!form.jobTitle.trim()) err.jobTitle = 'Job title is required.';
  if (!form.employmentType.trim()) err.employmentType = 'Employment type is required.';
  if (!form.company.trim()) err.company = 'Company or organization is required.';
  if (!startDateVal) err.startDate = 'Start date is required.';
  if (!form.locationType.trim()) err.locationType = 'Work arrangement is required.';
  if (form.skills.filter(Boolean).length < 1) err.skills = 'At least 1 skill is required.';
  return err;
}

export function workExpEndDateFieldErrors(
  form: WorkExpForm,
  startDateVal: string
): Record<string, string> {
  if (form.currentPosition) return {};
  const endDateVal = monthYearToValue(form.endMonth, form.endYear);
  if (!endDateVal) return { endDate: 'End date is required when not currently working here.' };
  if (startDateVal && endDateVal < startDateVal)
    return { endDate: 'End date cannot be earlier than start date.' };
  return {};
}

export function workExpMidPromotionNeedsEndDate(isLastPromo: boolean, promoEnd: string): boolean {
  return !isLastPromo && !promoEnd;
}

export function workExpPromotionValidationError(filledPromos: WorkExpFilledPromo[]): string | null {
  for (let j = 0; j < filledPromos.length; j++) {
    const { p, idx } = filledPromos[j];
    const promoStart = monthYearToValue(p.startMonth, p.startYear);
    if (!promoStart) return `Promotion ${idx + 1}: start date is required.`;
    const isLastPromo = j === filledPromos.length - 1;
    const promoEnd = monthYearToValue(p.endMonth, p.endYear);
    if (workExpMidPromotionNeedsEndDate(isLastPromo, promoEnd)) {
      return `Promotion ${idx + 1}: end date is required (the previous role can’t be “Present” when you add a newer role).`;
    }
    if (promoEnd && promoEnd < promoStart) {
      return `Promotion ${idx + 1}: end date cannot be earlier than start date.`;
    }
  }
  return null;
}

export function workExpJobEndAfterLatestPromotionMessage(
  form: WorkExpForm,
  filledPromos: WorkExpFilledPromo[]
): string | undefined {
  if (form.currentPosition || filledPromos.length === 0) return undefined;
  const jobEnd = monthYearToValue(form.endMonth, form.endYear);
  const latestPromoEnd = filledPromos
    .map(({ p }) => monthYearToValue(p.endMonth, p.endYear))
    .filter(Boolean)
    .sort()
    .pop();
  if (!latestPromoEnd || !jobEnd || jobEnd >= latestPromoEnd) return undefined;
  return 'Employment end date must be on/after the last promotion end date.';
}

export function mapWorkExpPromotionsForSubmit(form: WorkExpForm) {
  const trimmed = form.promotions.filter((p) => p.jobTitle.trim());
  const count = trimmed.length;
  return trimmed
    .map((p, i) => {
      const promoEndVal = monthYearToValue(p.endMonth, p.endYear);
      const isLast = i === count - 1;
      const currentPosition = isLast && !promoEndVal;
      return {
        jobTitle: p.jobTitle.trim(),
        startDate: monthYearToValue(p.startMonth, p.startYear) || undefined,
        endDate: currentPosition ? undefined : promoEndVal || undefined,
        currentPosition,
        media: (p.mediaItems ?? [])
          .filter((m) => m.url.trim())
          .slice(0, 5)
          .map((m) => ({
            url: m.url.trim(),
            title: m.title?.trim() || undefined,
          })),
      };
    })
    .slice(0, 5);
}

export function buildWorkExperienceProfileEntry(
  form: WorkExpForm,
  startDateVal: string,
  endDateVal: string | undefined,
  promotionsVal: ReturnType<typeof mapWorkExpPromotionsForSubmit>
) {
  const locationStr = buildLocationString(
    form.locationCity,
    form.locationState,
    form.locationCountry
  );
  return {
    jobTitle: form.jobTitle.trim(),
    employmentType: form.employmentType.trim() || undefined,
    company: form.company.trim(),
    companyDomain: form.companyDomain.trim() || undefined,
    companyLogo: form.companyLogo.trim() || undefined,
    companyLogoAlt: form.companyLogoAlt.trim() || undefined,
    currentPosition: form.currentPosition,
    startDate: startDateVal,
    endDate: endDateVal,
    location: locationStr.trim().slice(0, 180) || undefined,
    locationType: form.locationType.trim() || undefined,
    description: form.description.trim().slice(0, 5000) || undefined,
    skills: form.skills.filter(Boolean).slice(0, 10),
    promotions: promotionsVal,
    media: form.mediaItems
      .filter((m) => m.url.trim())
      .slice(0, 5)
      .map((m) => ({
        url: m.url.trim(),
        title: m.title?.trim() || undefined,
      })),
  };
}
