'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Briefcase,
  ChevronDown,
  Plus,
  Link2,
  ImagePlus,
  X,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { settingsBtnBlockPrimaryMd, settingsBtnBlockPrimarySm } from '@/app/settings/buttonStyles';
import { useSettingsAuthSlice } from '@/hooks/useSettingsAuthSlice';
import { UploadLogoDialog, MediaFullViewDialog } from '@/features/profile';
import { ImageUploadCropDialog } from '@/components/upload';
import { FormDialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/dialog';
import { GhostOutlineButton } from '@/components/ui';
import {
  FormInput,
  FormTextarea,
  FormCheckbox,
  Input,
  Label,
  SearchableSelect,
  EntitySearchInput,
  Textarea,
} from '@/components/retroui';
import { getCountryOptions, getStateOptions, getCityOptions, parseLocationString } from '@/lib/profile/profileLocation';
import { searchCompaniesWithApi } from '@/lib/blog/referenceSearch';
import { WorkExperienceCard } from '@/app/settings/settings-list/WorkExperienceCard';
import { SettingsSectionHeader } from '@/app/settings/settings-list/Header';
import { SettingsTabPanel, SettingsTabRoot } from '@/app/settings/settings-list/SettingsSectionHeading';
import { EMPLOYMENT_TYPE_OPTIONS, LOCATION_TYPE_SELECT_OPTIONS } from '@syntax-stories/shared';
import {
  MONTH_SELECT_OPTIONS,
  formatMonthYearMedium,
  monthYearToValue,
  valueToMonthYear,
  yearOptionsFromMin,
} from '@/lib/profile/dateLabels';
import { SettingsSectionEmptyState } from '../components/SettingsSectionEmptyState';
import {
  type MediaItem,
  type PromotionForm,
  type WorkExpForm,
  PROMOTION_DEFAULT,
  WORK_EXP_DEFAULT,
  YEAR_OPTIONS,
  locationWithoutType,
  normalizeDomain,
  getFilledWorkExpPromotions,
  collectWorkExpRequiredFieldErrors,
  workExpEndDateFieldErrors,
  workExpPromotionValidationError,
  workExpJobEndAfterLatestPromotionMessage,
  mapWorkExpPromotionsForSubmit,
  buildWorkExperienceProfileEntry,
  AddMediaLinksDialog,
  isImageUrl,
  MediaThumbnailRow,
  resolveProfileMediaItems,
  parseMediaLinkLineInput,
} from '../lib/workExperienceForm';




export function WorkExperiencesContent() {
  const { user, updateProfile, token } = useSettingsAuthSlice();
  const router = useRouter();
  const searchParams = useSearchParams();
  const list = (user?.workExperiences ?? []).map((w) => {
    const mediaItems: MediaItem[] = (w.media && w.media.length > 0)
      ? w.media.map((m) => ({ url: m.url, title: m.title }))
      : (w.mediaUrls ?? []).map((url) => ({ url }));
    const raw = w as { promotions?: Array<{ jobTitle?: string; startDate?: string; endDate?: string; currentPosition?: boolean; media?: { url: string; title?: string }[] }>; promotion?: { jobTitle?: string; startDate?: string; endDate?: string; currentPosition?: boolean } };
    const promotionsList = Array.isArray(raw.promotions) && raw.promotions.length > 0
      ? raw.promotions
      : raw.promotion && raw.promotion.jobTitle ? [raw.promotion] : [];
    const promotions = promotionsList
      .filter((p) => p && p.jobTitle)
      .map((p) => ({
        jobTitle: p.jobTitle!,
        startDate: p.startDate,
        endDate: p.endDate,
        currentPosition: !!p.currentPosition,
        mediaItems: ((p as { media?: { url: string; title?: string }[] }).media ?? []).map((m) => ({ url: m.url, title: m.title })),
      }));
    return {
      jobTitle: w.jobTitle ?? w.role ?? '',
      employmentType: w.employmentType ?? '',
      company: w.company ?? '',
      companyDomain: w.companyDomain ?? '',
      companyLogo: (w as { companyLogo?: string }).companyLogo ?? '',
      companyLogoAlt: (w as { companyLogoAlt?: string }).companyLogoAlt ?? '',
      currentPosition: !!w.currentPosition,
      startDate: w.startDate ?? '',
      endDate: w.endDate ?? '',
      location: w.location ?? '',
      locationType: w.locationType ?? '',
      description: w.description ?? '',
      skills: w.skills ?? [],
      promotions,
      mediaItems,
    };
  });
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<WorkExpForm>(WORK_EXP_DEFAULT);
  const [initialForm, setInitialForm] = useState<WorkExpForm>(WORK_EXP_DEFAULT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [addMediaDropdownOpen, setAddMediaDropdownOpen] = useState(false);
  const [uploadMediaDialogOpen, setUploadMediaDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [fullViewMedia, setFullViewMedia] = useState<MediaItem | null>(null);
  const [listPreviewMedia, setListPreviewMedia] = useState<MediaItem | null>(null);
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(null);
  const [promoMediaDropdownIndex, setPromoMediaDropdownIndex] = useState<number | null>(null);
  const [promoMediaLinkIndex, setPromoMediaLinkIndex] = useState<number | null>(null);
  const [promoMediaUploadIndex, setPromoMediaUploadIndex] = useState<number | null>(null);
  const [promoLinkUrl, setPromoLinkUrl] = useState('');
  const [promoLinkTitle, setPromoLinkTitle] = useState('');
  const [promoFullViewMedia, setPromoFullViewMedia] = useState<{ pIdx: number; item: MediaItem } | null>(null);
  const [companyLogoDialogOpen, setCompanyLogoDialogOpen] = useState(false);
  const addMediaDropdownRef = useRef<HTMLDivElement>(null);
  const hasFormChanged = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMediaDropdownRef.current && !addMediaDropdownRef.current.contains(e.target as Node)) {
        setAddMediaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openAdd = () => {
    setForm(WORK_EXP_DEFAULT);
    setInitialForm(WORK_EXP_DEFAULT);
    setEditingIndex(null);
    setFieldErrors({});
    setPromoMediaDropdownIndex(null);
    setPromoMediaLinkIndex(null);
    setPromoMediaUploadIndex(null);
    setPromoLinkUrl('');
    setPromoLinkTitle('');
    setPromoFullViewMedia(null);
    setDialogOpen(true);
  };
  const openEdit = useCallback(
    (i: number) => {
      const e = list[i];
      const parsed = parseLocationString(e.location ?? '');
      const start = valueToMonthYear(e.startDate ?? '');
      const end = valueToMonthYear(e.endDate ?? '');
      const locType = e.locationType ?? '';
      const nextForm: WorkExpForm = {
        ...WORK_EXP_DEFAULT,
        jobTitle: e.jobTitle,
        employmentType: e.employmentType,
        company: e.company,
        companyDomain: e.companyDomain,
        companyLogo: e.companyLogo ?? '',
        companyLogoAlt: e.companyLogoAlt ?? '',
        currentPosition: e.currentPosition,
        startDate: e.startDate,
        endDate: e.endDate,
        startMonth: start.month,
        startYear: start.year,
        endMonth: end.month,
        endYear: end.year,
        location: e.location ?? '',
        locationType: locType,
        locationCountry: parsed.countryCode,
        locationState: parsed.stateCode,
        locationCity: parsed.city,
        description: e.description,
        skills: e.skills ?? [],
        promotions: (e.promotions ?? []).map((p) => ({
          jobTitle: p.jobTitle ?? '',
          startMonth: valueToMonthYear(p.startDate ?? '').month,
          startYear: valueToMonthYear(p.startDate ?? '').year,
          endMonth: valueToMonthYear(p.endDate ?? '').month,
          endYear: valueToMonthYear(p.endDate ?? '').year,
          currentPosition: !!p.currentPosition,
          mediaItems: (p.mediaItems ?? []).map((m) => ({ url: m.url, title: m.title })),
        })),
        mediaItems: e.mediaItems ?? [],
      };
      setForm(nextForm);
      setInitialForm(nextForm);
      setEditingIndex(i);
      setFieldErrors({});
      setPromoMediaDropdownIndex(null);
      setPromoMediaLinkIndex(null);
      setPromoMediaUploadIndex(null);
      setPromoLinkUrl('');
      setPromoLinkTitle('');
      setPromoFullViewMedia(null);
      setDialogOpen(true);
    },
    [list],
  );
  const openedEditFromUrlRef = useRef(false);
  useEffect(() => {
    if (openedEditFromUrlRef.current || list.length === 0) return;
    const edit = searchParams.get('edit');
    if (edit == null) return;
    const idx = parseInt(edit, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= list.length) return;
    openedEditFromUrlRef.current = true;
    openEdit(idx);
    router.replace('/settings', { scroll: false });
  }, [list.length, openEdit, router, searchParams]);
  const remove = async (i: number) => {
    const next = list.filter((_, idx) => idx !== i);
    setSaving(true);
    try {
      await updateProfile({ workExperiences: next }, { section: 'work' });
      toast.success('Removed.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };
  const submitDialog = async () => {
    if (!hasFormChanged) {
      toast.error('No changes to save.', { id: 'syntax-no-changes' });
      return;
    }
    const startDateVal = monthYearToValue(form.startMonth, form.startYear);
    const err: Record<string, string> = {
      ...collectWorkExpRequiredFieldErrors(form, startDateVal),
      ...workExpEndDateFieldErrors(form, startDateVal),
    };
    const filledPromos = getFilledWorkExpPromotions(form);
    const promoToast = workExpPromotionValidationError(filledPromos);
    if (promoToast) {
      toast.error(promoToast, { id: 'syntax-work-promo' });
      return;
    }
    const jobVsPromoEnd = workExpJobEndAfterLatestPromotionMessage(form, filledPromos);
    if (jobVsPromoEnd) err.endDate = jobVsPromoEnd;

    if (Object.keys(err).length) {
      setFieldErrors(err);
      toast.error('Please fix the errors below.', { id: 'syntax-form-errors' });
      return;
    }
    setFieldErrors({});
    const endDateVal = form.currentPosition ? undefined : monthYearToValue(form.endMonth, form.endYear) || undefined;

    // Resolve pending media items (work experience + promotions) before building the entry.
    const resolveItems = async (items: MediaItem[]): Promise<MediaItem[] | null> => {
      try {
        return (await resolveProfileMediaItems(token, items)).map((x) => ({ url: x.url, title: x.title }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to upload media.', { id: 'syntax-media-upload' });
        return null;
      }
    };

    const resolvedMainMedia = await resolveItems(form.mediaItems);
    if (resolvedMainMedia === null) return;
    const resolvedPromotions: PromotionForm[] = [];
    for (const p of form.promotions) {
      const resolvedPromoMedia = await resolveItems(p.mediaItems ?? []);
      if (resolvedPromoMedia === null) return;
      resolvedPromotions.push({ ...p, mediaItems: resolvedPromoMedia });
    }

    const formForSubmit: WorkExpForm = {
      ...form,
      mediaItems: resolvedMainMedia,
      promotions: resolvedPromotions,
    };

    const promotionsVal = mapWorkExpPromotionsForSubmit(formForSubmit);
    const entry = buildWorkExperienceProfileEntry(formForSubmit, startDateVal, endDateVal, promotionsVal);
    const next = editingIndex !== null ? list.map((e, i) => (i === editingIndex ? entry : e)) : [...list, entry];
    setSaving(true);
    try {
      await updateProfile({ workExperiences: next }, { section: 'work' });
      toast.success(editingIndex !== null ? 'Updated.' : 'Added.', { id: 'syntax-work-entry-success' });
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = (skill: string) => {
    const s = skill.trim();
    if (s && !form.skills.includes(s) && form.skills.length < 30) setForm((f) => ({ ...f, skills: [...f.skills, s] }));
  };

  return (
    <SettingsTabRoot>
      <SettingsSectionHeader variant="work" onPrimaryAction={openAdd} disabled={saving} />

      <SettingsTabPanel className="space-y-5">
        {list.length === 0 ? (
          <SettingsSectionEmptyState
            icon={Briefcase}
            title="Empty Resume"
            tagline="You haven't added any work experiences. Start by adding your current or past roles."
          />
        ) : (
          <>
            {list.map((e, i) => {
              return (
                <WorkExperienceCard
                  key={i}
                  experience={e}
                  index={i}
                  saving={saving}
                  onEdit={() => openEdit(i)}
                  onRemove={() => setRemoveConfirmIndex(i)}
                  onPreviewMedia={(item) => setListPreviewMedia(item)}
                  formatMonthYear={formatMonthYearMedium}
                  locationWithoutType={locationWithoutType}
                  normalizeDomain={normalizeDomain}
                  isImageUrl={isImageUrl}
                />
              );
            })}
          </>
        )}
      </SettingsTabPanel>

      <ConfirmDialog
        open={removeConfirmIndex !== null}
        onClose={() => setRemoveConfirmIndex(null)}
        title="Delete Experience?"
        message="This will permanently remove this role from your profile. This action cannot be undone."
        confirmLabel="Destroy Record"
        variant="danger"
        loading={saving}
        onConfirm={() => { if (removeConfirmIndex !== null) { remove(removeConfirmIndex); setRemoveConfirmIndex(null); } }}
      />
      <MediaFullViewDialog
        open={!!listPreviewMedia}
        onClose={() => setListPreviewMedia(null)}
        src={listPreviewMedia?.url ?? ''}
        title={listPreviewMedia?.title}
      />

      {token ? (
        <UploadLogoDialog
          open={companyLogoDialogOpen}
          onClose={() => setCompanyLogoDialogOpen(false)}
          token={token}
          kind="company-logo"
          onSuccess={({ url, imageTitle }) => {
            setForm((f) => ({
              ...f,
              companyLogo: url,
              companyLogoAlt: imageTitle ?? '',
            }));
            setCompanyLogoDialogOpen(false);
          }}
        />
      ) : null}

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        titleIcon={<Briefcase aria-hidden />}
        title={editingIndex !== null ? 'Edit Position' : 'Work experience'}
        titleId="work-dialog"
        subtitle="Provide the details of your professional journey."
        panelClassName="max-w-2xl"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">* Required fields</p>
            <div className="flex gap-3">
              <GhostOutlineButton type="button" onClick={() => setDialogOpen(false)}>
                Cancel
              </GhostOutlineButton>
              <button
                type="button"
                onClick={submitDialog}
                disabled={saving || !hasFormChanged}
                className={cn(settingsBtnBlockPrimaryMd, 'px-6 py-2.5 text-xs tracking-wide')}
              >
                {saving ? 'Processing…' : hasFormChanged ? 'Confirm changes' : 'Save Milestone'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <FormInput id="we-job" label="Job title *" placeholder="Ex: Senior Frontend Engineer" maxLength={120} value={form.jobTitle} error={fieldErrors.jobTitle} onChange={(e) => { setForm((f) => ({ ...f, jobTitle: e.target.value })); if (fieldErrors.jobTitle) setFieldErrors((e2) => (e2.jobTitle ? { ...e2, jobTitle: '' } : e2)); }} />
          <SearchableSelect
            id="we-type"
            label="Employment type *"
            placeholder="Select type"
            value={form.employmentType}
            onChange={(v) => { setForm((f) => ({ ...f, employmentType: v })); if (fieldErrors.employmentType) setFieldErrors((e) => (e.employmentType ? { ...e, employmentType: '' } : e)); }}
            options={EMPLOYMENT_TYPE_OPTIONS}
            listMaxHeight={220}
            error={fieldErrors.employmentType}
          />
          <EntitySearchInput
            id="we-company"
            label="Company or organization *"
            placeholder="Type company name (e.g. Microsoft)"
            value={form.company}
            onChange={(v) => { setForm((f) => ({ ...f, company: v })); if (fieldErrors.company) setFieldErrors((e2) => (e2.company ? { ...e2, company: '' } : e2)); }}
            onDomainSelect={(d) => setForm((f) => ({ ...f, companyDomain: d }))}
            searchOptions={searchCompaniesWithApi}
            error={fieldErrors.company}
            maxLength={200}
          />
          <FormInput id="we-domain" label="Company domain (optional)" placeholder="Ex: company.com" maxLength={120} value={form.companyDomain} onChange={(e) => setForm((f) => ({ ...f, companyDomain: e.target.value }))} />
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Company logo (optional)</Label>
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center border-2 border-border bg-muted/30 overflow-hidden">
                {form.companyLogo ? (
                  <img
                    src={form.companyLogo}
                    alt={form.companyLogoAlt.trim() || 'Company logo'}
                    title={form.companyLogoAlt.trim() || undefined}
                    className="size-full object-contain"
                    onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : form.companyDomain ? (
                  <img src={`https://logo.clearbit.com/${form.companyDomain.replace(/^https?:\/\//i, '').replace(/\/$/, '')}`} alt="" className="size-full object-contain" onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <Building2 className="size-6 text-muted-foreground" />
                )}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCompanyLogoDialogOpen(true)}
                  disabled={!token}
                  className="px-3 py-1.5 border-2 border-border text-[10px] font-bold uppercase hover:bg-muted/30 disabled:opacity-50"
                >
                  Upload logo
                </button>
                {form.companyLogo && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, companyLogo: '', companyLogoAlt: '' }))} className="px-3 py-1.5 border-2 border-destructive text-destructive text-[10px] font-bold uppercase hover:bg-destructive/10">
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <FormCheckbox
            id="we-current"
            label="I'm currently working here"
            checked={form.currentPosition}
            onCheckedChange={(v) =>
              setForm((f) => {
                if (v) return { ...f, currentPosition: true, endMonth: '', endYear: '' };
                const latestPromoEnd = f.promotions
                  .filter((p) => p.jobTitle.trim())
                  .map((p) => monthYearToValue(p.endMonth, p.endYear))
                  .filter(Boolean)
                  .sort()
                  .pop();
                const currEnd = monthYearToValue(f.endMonth, f.endYear);
                if (latestPromoEnd && (!currEnd || currEnd < latestPromoEnd)) {
                  const parts = valueToMonthYear(latestPromoEnd);
                  return { ...f, currentPosition: false, endMonth: parts.month, endYear: parts.year };
                }
                return { ...f, currentPosition: false };
              })
            }
          />
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t-2 border-border/50">
            <div className="w-full space-y-4">
              {form.promotions.map((promo, pIdx) => {
                const isLastPromo = pIdx === form.promotions.length - 1;
                const endDateRequired = !isLastPromo;
                return (
                  <div key={pIdx} className="border-2 border-primary/30 bg-primary/5 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-primary flex items-center gap-2">
                        <TrendingUp className="size-4" /> Promotion{form.promotions.length > 1 ? ` ${pIdx + 1}` : ''} — new position & dates
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, promotions: f.promotions.filter((_, i) => i !== pIdx) }))}
                        className="text-[10px] font-bold uppercase text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                    <FormInput id={`we-promo-title-${pIdx}`} label="New position *" placeholder="Ex: Senior Engineer" maxLength={120} value={promo.jobTitle} onChange={(e) => setForm((f) => ({ ...f, promotions: f.promotions.map((p, i) => i === pIdx ? { ...p, jobTitle: e.target.value } : p) }))} />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">Promotion start date *</Label>
                        <div className="flex gap-2">
                          <SearchableSelect id={`we-promo-start-month-${pIdx}`} label="" placeholder="Month" value={promo.startMonth} onChange={(v) => setForm((f) => ({ ...f, promotions: f.promotions.map((p, i) => i === pIdx ? { ...p, startMonth: v } : p) }))} options={MONTH_SELECT_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" />
                          <SearchableSelect
                            id={`we-promo-start-year-${pIdx}`}
                            label=""
                            placeholder="Year"
                            value={promo.startYear}
                            onChange={(v) =>
                              setForm((f) => ({
                                ...f,
                                promotions: f.promotions.map((p, i) => {
                                  if (i !== pIdx) return p;
                                  const nextStartYear = v;
                                  const sy = parseInt(nextStartYear || 10);
                                  const ey = parseInt(p.endYear || 10);
                                  const nextEndYear = Number.isFinite(sy) && Number.isFinite(ey) && ey < sy ? nextStartYear : p.endYear;
                                  return { ...p, startYear: nextStartYear, endYear: nextEndYear };
                                }),
                              }))
                            }
                            options={YEAR_OPTIONS}
                            listMaxHeight={220}
                            widthClass="flex-1 min-w-0"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">End date{endDateRequired ? ' *' : ' (optional for current role)'}</Label>
                        <div className="flex gap-2">
                          <SearchableSelect id={`we-promo-end-month-${pIdx}`} label="" placeholder="Month" value={promo.endMonth} onChange={(v) => setForm((f) => ({ ...f, promotions: f.promotions.map((p, i) => i === pIdx ? { ...p, endMonth: v } : p) }))} options={MONTH_SELECT_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" />
                          <SearchableSelect
                            id={`we-promo-end-year-${pIdx}`}
                            label=""
                            placeholder="Year"
                            value={promo.endYear}
                            onChange={(v) => setForm((f) => ({ ...f, promotions: f.promotions.map((p, i) => i === pIdx ? { ...p, endYear: v } : p) }))}
                            options={yearOptionsFromMin(promo.startYear)}
                            listMaxHeight={220}
                            widthClass="flex-1 min-w-0"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase">Media (optional, max 5)</Label>
                      <p className="text-[9px] text-muted-foreground">
                        Mix links and uploads. One URL per line in the link box; optional title when adding a single URL.
                      </p>
                      {promo.mediaItems.length > 0 && (
                        <ul className="space-y-2">
                          {promo.mediaItems.map((m, mi) => (
                            <MediaThumbnailRow
                              key={mi}
                              item={m}
                              onPreview={() => setPromoFullViewMedia({ pIdx, item: m })}
                              onRemove={() => setForm((f) => ({ ...f, promotions: f.promotions.map((p, i) => i === pIdx ? { ...p, mediaItems: p.mediaItems.filter((_, j) => j !== mi) } : p) }))}
                            />
                          ))}
                        </ul>
                      )}
                      {promo.mediaItems.length < 5 && (
                        <div className="flex flex-col gap-2">
                          {promoMediaDropdownIndex === pIdx && (
                            <div className="fixed inset-0 z-[99]" aria-hidden onClick={() => setPromoMediaDropdownIndex(null)} />
                          )}
                          <div className="relative z-[120] w-fit max-w-full">
                            <button
                              type="button"
                              onClick={() => setPromoMediaDropdownIndex((prev) => (prev === pIdx ? null : pIdx))}
                              className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border text-[10px] font-bold uppercase hover:bg-muted/30"
                            >
                              <Plus className="size-3" /> Add media
                              <ChevronDown className={cn('size-3 transition-transform', promoMediaDropdownIndex === pIdx && 'rotate-180')} />
                            </button>
                            {promoMediaDropdownIndex === pIdx && (
                              <div className="absolute left-0 top-full z-[130] mt-1 min-w-[200px] border-2 border-border bg-card shadow py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPromoMediaDropdownIndex(null);
                                    if (promoMediaLinkIndex !== pIdx) {
                                      setPromoLinkUrl('');
                                      setPromoLinkTitle('');
                                    }
                                    setPromoMediaLinkIndex(pIdx);
                                  }}
                                  className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"
                                >
                                  <Link2 className="size-4" /> Add link
                                </button>
                                <button type="button" onClick={() => { setPromoMediaDropdownIndex(null); setPromoMediaUploadIndex(pIdx); }} className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50">
                                  <ImagePlus className="size-4" /> Upload media
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {promoMediaLinkIndex === pIdx && (
                        <div className="relative z-0 overflow-hidden border-2 border-border bg-muted/10">
                          <div className="flex items-center justify-between gap-2 border-b-2 border-border bg-muted/20 px-3 py-2">
                            <span className="text-[10px] font-bold uppercase tracking-wide">Add link</span>
                            <button
                              type="button"
                              onClick={() => { setPromoMediaLinkIndex(null); setPromoLinkUrl(''); setPromoLinkTitle(''); }}
                              className="flex size-8 shrink-0 items-center justify-center border-2 border-border bg-card text-muted-foreground shadow hover:bg-muted hover:text-foreground"
                              aria-label="Close"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                          <div className="space-y-2 p-3">
                            <Label className="text-[10px] font-bold uppercase">Link URL(s)</Label>
                            <Textarea
                              placeholder={'https://example.com\nhttps://another.org'}
                              value={promoLinkUrl}
                              onChange={(e) => setPromoLinkUrl(e.target.value)}
                              className="min-h-[5rem] resize-y text-sm font-mono"
                              rows={4}
                              autoComplete="off"
                            />
                            <Label className="text-[10px] font-bold uppercase">Title (optional)</Label>
                            <Input placeholder="Single-URL adds only" value={promoLinkTitle} onChange={(e) => setPromoLinkTitle(e.target.value)} className="text-sm" maxLength={120} />
                            <div className="flex gap-2">
                              <GhostOutlineButton type="button" size="sm" onClick={() => { setPromoMediaLinkIndex(null); setPromoLinkUrl(''); setPromoLinkTitle(''); }}>Cancel</GhostOutlineButton>
                              <button
                                type="button"
                                onClick={() => {
                                  const { urls, skippedNonEmpty } = parseMediaLinkLineInput(promoLinkUrl);
                                  if (urls.length === 0) {
                                    toast.error(
                                      skippedNonEmpty > 0
                                        ? 'No valid URLs. Use https://… or domain.com, one per line.'
                                        : 'Enter at least one URL (one per line).',
                                      { id: 'syntax-invalid-url' }
                                    );
                                    return;
                                  }
                                  const title = promoLinkTitle.trim() || undefined;
                                  let nextLen = 0;
                                  let added = 0;
                                  flushSync(() => {
                                    setForm((f) => {
                                      const promos = f.promotions;
                                      const p = promos[pIdx];
                                      if (!p) return f;
                                      const prev = Array.isArray(p.mediaItems) ? p.mediaItems : [];
                                      const room = Math.max(0, 5 - prev.length);
                                      const slice = urls.slice(0, room);
                                      added = slice.length;
                                      const titled = slice.map((url, i) => ({
                                        url,
                                        title: slice.length === 1 ? title : i === 0 ? title : undefined,
                                      }));
                                      const nextItems = [...prev, ...titled];
                                      nextLen = nextItems.length;
                                      return {
                                        ...f,
                                        promotions: promos.map((promo, i) =>
                                          i === pIdx ? { ...promo, mediaItems: nextItems } : promo
                                        ),
                                      };
                                    });
                                  });
                                  setPromoLinkUrl('');
                                  setPromoLinkTitle('');
                                  if (nextLen >= 5) setPromoMediaLinkIndex(null);
                                  if (skippedNonEmpty > 0) {
                                    toast.message(`Skipped ${skippedNonEmpty} line(s) that were not valid URLs.`, { id: 'syntax-skip-url-lines' });
                                  }
                                  if (urls.length > added) {
                                    toast.message(`Added ${added} link(s); max is 5 media items for this role.`, { id: 'syntax-max-media' });
                                  }
                                }}
                                className={cn(settingsBtnBlockPrimarySm, 'px-3 py-1.5 text-[10px] font-bold')}
                              >
                                Add link(s)
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, promotions: [...f.promotions, { ...PROMOTION_DEFAULT }].slice(0, 5) }))}
                disabled={form.promotions.length >= 5}
                className="inline-flex items-center gap-2 px-3 py-2 border-2 border-border bg-muted/30 font-bold text-[10px] uppercase tracking-wide hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <TrendingUp className="size-4" /> Add promotion (same company, new role)
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Start date *</Label>
              <div className="flex gap-2">
                <SearchableSelect
                  id="we-start-month"
                  label=""
                  placeholder="Month"
                  value={form.startMonth}
                  onChange={(v) => { setForm((f) => ({ ...f, startMonth: v })); if (fieldErrors.startDate) setFieldErrors((e2) => (e2.startDate ? { ...e2, startDate: '' } : e2)); }}
                  options={MONTH_SELECT_OPTIONS}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                />
                <SearchableSelect
                  id="we-start-year"
                  label=""
                  placeholder="Year"
                  value={form.startYear}
                  onChange={(v) => {
                    setForm((f) => {
                      const sy = parseInt(v || 10);
                      const ey = parseInt(f.endYear || 10);
                      const nextEndYear = Number.isFinite(sy) && Number.isFinite(ey) && ey < sy ? v : f.endYear;
                      return { ...f, startYear: v, endYear: nextEndYear };
                    });
                    if (fieldErrors.startDate) setFieldErrors((e2) => (e2.startDate ? { ...e2, startDate: '' } : e2));
                  }}
                  options={YEAR_OPTIONS}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                />
              </div>
              {fieldErrors.startDate && <p className="text-xs text-destructive font-medium">{fieldErrors.startDate}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">End date{!form.currentPosition ? ' *' : ''}</Label>
              <div className="flex gap-2">
                <SearchableSelect
                  id="we-end-month"
                  label=""
                  placeholder="Month"
                  value={form.endMonth}
                  onChange={(v) => { setForm((f) => ({ ...f, endMonth: v })); if (fieldErrors.endDate) setFieldErrors((e) => (e.endDate ? { ...e, endDate: '' } : e)); }}
                  options={MONTH_SELECT_OPTIONS}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                  disabled={form.currentPosition}
                />
                <SearchableSelect
                  id="we-end-year"
                  label=""
                  placeholder="Year"
                  value={form.endYear}
                  onChange={(v) => { setForm((f) => ({ ...f, endYear: v })); if (fieldErrors.endDate) setFieldErrors((e) => (e.endDate ? { ...e, endDate: '' } : e)); }}
                  options={yearOptionsFromMin(form.startYear)}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                  disabled={form.currentPosition}
                />
              </div>
              {fieldErrors.endDate && <p className="text-xs text-destructive font-medium">{fieldErrors.endDate}</p>}
              {form.currentPosition && !fieldErrors.endDate && <p className="text-[9px] text-muted-foreground">Disabled while currently working here</p>}
            </div>
          </div>
          <SearchableSelect
            id="we-location-type"
            label="Work arrangement *"
            placeholder="Select work arrangement *"
            value={form.locationType}
            onChange={(v) => { setForm((f) => ({ ...f, locationType: v })); if (fieldErrors.locationType) setFieldErrors((e) => (e.locationType ? { ...e, locationType: '' } : e)); }}
            options={[...LOCATION_TYPE_SELECT_OPTIONS]}
            listMaxHeight={180}
            error={fieldErrors.locationType}
          />
          <div className="flex flex-col gap-4">
            <SearchableSelect
              id="we-country"
              label="Country"
              placeholder="Select country"
              value={form.locationCountry}
              onChange={(v) => setForm((f) => ({ ...f, locationCountry: v, locationState: '', locationCity: '' }))}
              options={getCountryOptions()}
              listMaxHeight={200}
            />
            <SearchableSelect
              id="we-state"
              label="State / Region"
              placeholder="Select state"
              value={form.locationState}
              onChange={(v) => setForm((f) => ({ ...f, locationState: v, locationCity: '' }))}
              options={getStateOptions(form.locationCountry)}
              listMaxHeight={200}
              disabled={!form.locationCountry}
            />
            <SearchableSelect
              id="we-city"
              label="City"
              placeholder="Select city"
              value={form.locationCity}
              onChange={(v) => setForm((f) => ({ ...f, locationCity: v }))}
              options={getCityOptions(form.locationCountry, form.locationState)}
              listMaxHeight={200}
              disabled={!form.locationState}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Media (optional)</Label>
            <p className="text-[9px] text-muted-foreground">
              Up to 5 items total — any mix of links and uploaded images. Paste one URL per line to add several links at once; optional title applies when you add a single URL.
            </p>
            {form.mediaItems.length > 0 && (
              <ul className="space-y-2">
                {form.mediaItems.map((m, i) => (
                  <MediaThumbnailRow
                    key={i}
                    item={m}
                    onPreview={() => setFullViewMedia(m)}
                    onRemove={() => setForm((f) => ({ ...f, mediaItems: f.mediaItems.filter((_, j) => j !== i) }))}
                  />
                ))}
              </ul>
            )}
            <MediaFullViewDialog open={!!fullViewMedia} onClose={() => setFullViewMedia(null)} src={fullViewMedia?.url ?? ''} title={fullViewMedia?.title} />
            {form.mediaItems.length < 5 && (
              <div className="flex flex-col gap-2" ref={addMediaDropdownRef}>
                {addMediaDropdownOpen && (
                  <div
                    className="fixed inset-0 z-[99]"
                    aria-hidden
                    onClick={() => setAddMediaDropdownOpen(false)}
                  />
                )}
                <div className="relative z-[120] w-fit max-w-full">
                  <button
                    type="button"
                    onClick={() => setAddMediaDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border text-[10px] font-bold uppercase hover:bg-muted/30"
                  >
                    <Plus className="size-3" /> Add media
                    <ChevronDown className={cn('size-3 transition-transform', addMediaDropdownOpen && 'rotate-180')} />
                  </button>
                  {addMediaDropdownOpen && (
                    <div className="absolute left-0 top-full z-[130] mt-1 min-w-[200px] border-2 border-border bg-card shadow py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAddMediaDropdownOpen(false);
                          setLinkDialogOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"
                      >
                        <Link2 className="size-4" /> Add link
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddMediaDropdownOpen(false);
                          setUploadMediaDialogOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"
                      >
                        <ImagePlus className="size-4" /> Upload media
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {token && (
            <>
              <ImageUploadCropDialog
                open={uploadMediaDialogOpen}
                onClose={() => setUploadMediaDialogOpen(false)}
                titleId="work-exp-main-media-crop"
                title="Upload media"
                titleIcon={<ImagePlus className="size-4 shrink-0 text-primary" aria-hidden />}
                subtitle="Square crop · max 5 MB · uploads when you save this experience."
                subtitleClassName="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
                maxSizeBytes={5 * 1024 * 1024}
                aspect={1}
                imageTitleField
                confirmLabel="Save & add"
                chooseAnotherLabel="Choose another"
                onConfirm={async (file, meta) => {
                  if (!token) throw new Error('Not signed in.');
                  const url = URL.createObjectURL(file);
                  const title = (meta?.imageTitle ?? '').trim() || 'Media image';
                  setForm((f) => ({
                    ...f,
                    mediaItems: [...f.mediaItems, { url, title, isPending: true, pendingFile: file }].slice(0, 5),
                  }));
                  toast.success('Media staged. It will upload when you save.');
                }}
              />
              <AddMediaLinksDialog
                open={linkDialogOpen}
                onClose={() => setLinkDialogOpen(false)}
                maxCount={Math.max(0, 5 - form.mediaItems.length)}
                onAdd={(items) => {
                  if (!items.length) return;
                  setForm((f) => {
                    const prev = Array.isArray(f.mediaItems) ? f.mediaItems : [];
                    const room = Math.max(0, 5 - prev.length);
                    if (room <= 0) return f;
                    const slice = items.slice(0, room);
                    return { ...f, mediaItems: [...prev, ...slice] };
                  });
                }}
              />
              <ImageUploadCropDialog
                open={promoMediaUploadIndex !== null}
                onClose={() => setPromoMediaUploadIndex(null)}
                titleId="work-exp-promo-media-crop"
                title="Upload media"
                titleIcon={<ImagePlus className="size-4 shrink-0 text-primary" aria-hidden />}
                subtitle="Square crop · max 5 MB · uploads when you save this experience."
                subtitleClassName="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
                maxSizeBytes={5 * 1024 * 1024}
                aspect={1}
                imageTitleField
                confirmLabel="Save & add"
                chooseAnotherLabel="Choose another"
                onConfirm={async (file, meta) => {
                  if (!token) throw new Error('Not signed in.');
                  const idx = promoMediaUploadIndex;
                  if (idx === null) return;
                  const url = URL.createObjectURL(file);
                  const title = (meta?.imageTitle ?? '').trim() || 'Media image';
                  setForm((f) => ({
                    ...f,
                    promotions: f.promotions.map((p, i) =>
                      i === idx ? { ...p, mediaItems: [...p.mediaItems, { url, title, isPending: true, pendingFile: file }].slice(0, 5) } : p
                    ),
                  }));
                  setPromoMediaUploadIndex(null);
                  toast.success('Media staged. It will upload when you save.');
                }}
              />
            </>
          )}
          <MediaFullViewDialog
            open={!!promoFullViewMedia}
            onClose={() => setPromoFullViewMedia(null)}
            src={promoFullViewMedia?.item.url ?? ''}
            title={promoFullViewMedia?.item.title}
          />
          <FormTextarea id="we-desc" label="Description — Key technologies, projects, achievements" placeholder="Key technologies, projects, and achievements" maxLength={5000} rows={5} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 5000) }))} />
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="we-skills">Skills * (min 1)</Label>
            <Input
              id="we-skills"
              placeholder="Search skills. Add commas (,) or press Enter. Min 1, max 30."
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const input = e.target as HTMLInputElement;
                  const raw = input.value;
                  raw
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .forEach(addSkill);
                  input.value = '';
                  if (fieldErrors.skills) setFieldErrors((e2) => (e2.skills ? { ...e2, skills: '' } : e2));
                }
              }}
              onBlur={(e) => {
                const v = e.target.value;
                if (v.includes(',')) {
                  v.split(',').forEach(addSkill);
                  e.target.value = '';
                  if (fieldErrors.skills) setFieldErrors((e2) => (e2.skills ? { ...e2, skills: '' } : e2));
                }
              }}
              className={fieldErrors.skills ? 'border-destructive' : ''}
            />
            {fieldErrors.skills && <p className="text-xs text-destructive font-medium">{fieldErrors.skills}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.skills.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted border border-border text-[10px] font-bold">
                  {s}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((_, j) => j !== i) }))} className="hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </FormDialog>
    </SettingsTabRoot>
  );
}

