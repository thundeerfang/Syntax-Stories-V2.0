'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Award, ChevronDown, Plus, Link2, ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { settingsBtnBlockPrimarySm } from '@/app/settings/buttonStyles';
import { useSettingsAuthSlice } from '@/hooks/useSettingsAuthSlice';
import { UploadLogoDialog, MediaFullViewDialog } from '@/features/profile';
import { ImageUploadCropDialog } from '@/components/upload';
import { buildUploadImageMeta } from '@/lib/media/uploadImageMeta';
import { FormDialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/dialog';
import { GhostOutlineButton } from '@/components/ui';
import {
  FormInput,
  FormTextarea,
  Input,
  Label,
  SearchableSelect,
  EntitySearchInput,
  Textarea,
} from '@/components/retroui';
import { searchApi } from '@/api/search';
import { CertificationCard } from '@/components/settings-list/CertificationCard';
import { SettingsSectionHeader } from '@/app/settings/settings-list/Header';
import {
  SettingsTabPanel,
  SettingsTabRoot,
} from '@/app/settings/settings-list/SettingsSectionHeading';
import {
  MONTH_SELECT_OPTIONS,
  PROFILE_CERT_EXPIRATION_END_YEAR,
  formatMonthYearMedium,
  monthYearToValue,
  valueToMonthYear,
  yearOptionsFromMin,
} from '@/lib/profile/dateLabels';
import { SettingsSectionEmptyState } from '../components/SettingsSectionEmptyState';
import { FormSection } from '../components/FormSection';
import {
  type MediaItem,
  resolveProfileMediaItems,
  domainFromUrl,
  isImageUrl,
  YEAR_OPTIONS,
  MediaThumbnailRow,
  parseMediaLinkLineInput,
} from '../lib/profileMediaForm';

type CertForm = {
  name: string;
  issuingOrganization: string;
  issuerLogo: string;
  issuerLogoAlt: string;
  issueDate: string;
  expirationDate: string;
  issueMonth: string;
  issueYear: string;
  expMonth: string;
  expYear: string;
  credentialId: string;
  credentialUrl: string;
  description: string;
  skills: string[];
  mediaItems: MediaItem[];
};

const CERT_DEFAULT: CertForm = {
  name: '',
  issuingOrganization: '',
  issuerLogo: '',
  issuerLogoAlt: '',
  issueDate: '',
  expirationDate: '',
  issueMonth: '',
  issueYear: '',
  expMonth: '',
  expYear: '',
  credentialId: '',
  credentialUrl: '',
  description: '',
  skills: [],
  mediaItems: [],
};

export function CertificationsContent() {
  const { user, updateProfile, token } = useSettingsAuthSlice();
  const router = useRouter();
  const searchParams = useSearchParams();
  const list = (user?.certifications ?? []).map((c) => {
    const issue = valueToMonthYear(c.issueDate ?? '');
    const exp = valueToMonthYear(c.expirationDate ?? '');
    return {
      name: c.name ?? '',
      issuingOrganization: c.issuingOrganization ?? '',
      issuerLogo: (c as { issuerLogo?: string }).issuerLogo ?? '',
      issuerLogoAlt: (c as { issuerLogoAlt?: string }).issuerLogoAlt ?? '',
      issueDate: c.issueDate ?? '',
      expirationDate: c.expirationDate ?? '',
      issueMonth: issue.month,
      issueYear: issue.year,
      expMonth: exp.month,
      expYear: exp.year,
      credentialId: c.credentialId ?? '',
      credentialUrl: c.credentialUrl ?? '',
      description: c.description ?? '',
      skills: (c as { skills?: string[] }).skills ?? [],
      mediaItems: ((c as { media?: MediaItem[] }).media ?? []).map((m) => ({
        url: m.url,
        title: m.title,
      })),
    };
  });
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<CertForm>(CERT_DEFAULT);
  const [initialForm, setInitialForm] = useState<CertForm>(CERT_DEFAULT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [certAddMediaDropdownOpen, setCertAddMediaDropdownOpen] = useState(false);
  const [certShowLinkForm, setCertShowLinkForm] = useState(false);
  const [certUploadMediaDialogOpen, setCertUploadMediaDialogOpen] = useState(false);
  const [certLinkUrl, setCertLinkUrl] = useState('');
  const [certLinkTitle, setCertLinkTitle] = useState('');
  const [certFullViewMedia, setCertFullViewMedia] = useState<MediaItem | null>(null);
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(null);
  const [certLogoDialogOpen, setCertLogoDialogOpen] = useState(false);
  const certMediaDropdownRef = useRef<HTMLDivElement>(null);
  const hasFormChanged = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm]
  );
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (certMediaDropdownRef.current && !certMediaDropdownRef.current.contains(e.target as Node))
        setCertAddMediaDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openAdd = () => {
    setForm(CERT_DEFAULT);
    setInitialForm(CERT_DEFAULT);
    setEditingIndex(null);
    setFieldErrors({});
    setDialogOpen(true);
  };
  const openEdit = useCallback(
    (i: number) => {
      const next = { ...CERT_DEFAULT, ...list[i] };
      setForm(next);
      setInitialForm(next);
      setEditingIndex(i);
      setFieldErrors({});
      setDialogOpen(true);
    },
    [list]
  );
  const openedEditFromUrlRefCert = useRef(false);
  useEffect(() => {
    if (openedEditFromUrlRefCert.current || list.length === 0) return;
    const edit = searchParams.get('edit');
    if (edit == null) return;
    const idx = parseInt(edit, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= list.length) return;
    openedEditFromUrlRefCert.current = true;
    openEdit(idx);
    router.replace('/settings', { scroll: false });
  }, [list.length, openEdit, router, searchParams]);
  const remove = async (i: number) => {
    const next = list
      .filter((_, idx) => idx !== i)
      .map((c) => ({
        name: c.name,
        issuingOrganization: c.issuingOrganization,
        issuerLogo: c.issuerLogo,
        issuerLogoAlt: c.issuerLogoAlt,
        issueDate: c.issueDate,
        expirationDate: c.expirationDate,
        credentialId: c.credentialId,
        credentialUrl: c.credentialUrl,
        description: c.description,
        skills: c.skills,
        media: c.mediaItems.map((m) => ({ url: m.url, title: m.title })),
      }));
    setSaving(true);
    try {
      await updateProfile({ certifications: next }, { section: 'certifications' });
      toast.success('Removed.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };
  const addCertSkill = (skill: string) => {
    const s = skill.trim();
    if (s && !form.skills.includes(s) && form.skills.length < 30)
      setForm((f) => ({ ...f, skills: [...f.skills, s] }));
  };
  const submitDialog = async () => {
    if (!hasFormChanged) {
      toast.error('No changes to save.', { id: 'syntax-no-changes' });
      return;
    }
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = 'Certification name is required.';
    if (!form.issuingOrganization.trim())
      err.issuingOrganization = 'Issuing organization is required.';
    const issueDateVal = monthYearToValue(form.issueMonth, form.issueYear);
    if (!issueDateVal) err.issueDate = 'Issue date is required.';
    const expDateVal = monthYearToValue(form.expMonth, form.expYear);
    if (expDateVal && issueDateVal && expDateVal < issueDateVal)
      err.expirationDate = 'Expiration date cannot be earlier than issue date.';
    if (form.skills.filter(Boolean).length < 1) err.skills = 'At least 1 skill is required.';
    if (Object.keys(err).length) {
      setFieldErrors(err);
      toast.error('Please fix the errors below.', { id: 'syntax-form-errors' });
      return;
    }
    setFieldErrors({});
    let resolvedCertMedia: { url: string; title?: string }[];
    try {
      resolvedCertMedia = await resolveProfileMediaItems(token, form.mediaItems);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to upload media.', {
        id: 'syntax-media-upload',
      });
      return;
    }
    const entry = {
      name: form.name.trim().slice(0, 120),
      issuingOrganization: form.issuingOrganization.trim().slice(0, 120),
      issuerLogo: form.issuerLogo.trim() || undefined,
      issuerLogoAlt: form.issuerLogoAlt.trim() || undefined,
      issueDate: issueDateVal,
      expirationDate: expDateVal || undefined,
      credentialId: form.credentialId.trim().slice(0, 80) || undefined,
      credentialUrl: form.credentialUrl.trim().slice(0, 500) || undefined,
      description: form.description.trim().slice(0, 2000) || undefined,
      skills: form.skills.filter(Boolean).slice(0, 30),
      media: resolvedCertMedia,
    };
    const next =
      editingIndex !== null
        ? list.map((e, i) => (i === editingIndex ? entry : e))
        : [...list, entry];
    setSaving(true);
    try {
      await updateProfile({ certifications: next }, { section: 'certifications' });
      toast.success(editingIndex !== null ? 'Updated.' : 'Added.', {
        id: 'syntax-cert-entry-success',
      });
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsTabRoot>
      <SettingsSectionHeader variant="certifications" onPrimaryAction={openAdd} disabled={saving} />
      <SettingsTabPanel>
        <FormSection>
          {list.length === 0 ? (
            <SettingsSectionEmptyState
              icon={Award}
              title="No licenses or certifications yet"
              tagline="Add credentials to stand out. Show what you've earned."
            />
          ) : (
            <>
              {list.map((e, i) => {
                return (
                  <CertificationCard
                    key={i}
                    cert={e}
                    index={i}
                    saving={saving}
                    onEdit={() => openEdit(i)}
                    onRemove={() => setRemoveConfirmIndex(i)}
                    onPreviewMedia={(item) => setCertFullViewMedia(item)}
                    formatMonthYear={formatMonthYearMedium}
                    domainFromUrl={domainFromUrl}
                    isImageUrl={isImageUrl}
                  />
                );
              })}
            </>
          )}
        </FormSection>
      </SettingsTabPanel>
      <ConfirmDialog
        open={removeConfirmIndex !== null}
        onClose={() => setRemoveConfirmIndex(null)}
        title="Remove certification"
        message="This entry will be removed from your profile. You can add it again later."
        confirmLabel="Remove"
        variant="danger"
        loading={saving}
        onConfirm={() => {
          if (removeConfirmIndex !== null) {
            remove(removeConfirmIndex);
            setRemoveConfirmIndex(null);
          }
        }}
      />
      <MediaFullViewDialog
        open={!!certFullViewMedia}
        onClose={() => setCertFullViewMedia(null)}
        src={certFullViewMedia?.url ?? ''}
        title={certFullViewMedia?.title}
      />
      {token ? (
        <UploadLogoDialog
          open={certLogoDialogOpen}
          onClose={() => setCertLogoDialogOpen(false)}
          token={token}
          kind="org-logo"
          onSuccess={({ url, imageTitle }) => {
            setForm((f) => ({
              ...f,
              issuerLogo: url,
              issuerLogoAlt: imageTitle ?? '',
            }));
            setCertLogoDialogOpen(false);
          }}
        />
      ) : null}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        titleIcon={<Award aria-hidden />}
        title="License or certification"
        titleId="cert-dialog"
        subtitle="Name, issuing organization, issue date, and at least 1 skill."
        panelClassName="max-w-2xl"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              * Required fields
            </p>
            <div className="flex gap-3">
              <GhostOutlineButton type="button" onClick={() => setDialogOpen(false)}>
                Cancel
              </GhostOutlineButton>
              <button
                type="button"
                onClick={submitDialog}
                disabled={saving || !hasFormChanged}
                className={cn(settingsBtnBlockPrimarySm, 'px-5 py-2.5 text-xs tracking-wide')}
              >
                {saving ? 'Saving…' : hasFormChanged ? 'Confirm changes' : 'Save'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <FormInput
            id="cert-name"
            label="Certification name *"
            placeholder="Ex: AWS Certified Solutions Architect"
            maxLength={120}
            value={form.name}
            error={fieldErrors.name}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              if (fieldErrors.name) setFieldErrors((e2) => (e2.name ? { ...e2, name: '' } : e2));
            }}
          />
          <EntitySearchInput
            id="cert-org"
            label="Issuing organization *"
            placeholder="Type organization (e.g. AWS, Coursera)"
            value={form.issuingOrganization}
            onChange={(v) => {
              setForm((f) => ({ ...f, issuingOrganization: v }));
              if (fieldErrors.issuingOrganization)
                setFieldErrors((e2) =>
                  e2.issuingOrganization ? { ...e2, issuingOrganization: '' } : e2
                );
            }}
            searchOptions={searchApi.searchOrganizations}
            error={fieldErrors.issuingOrganization}
            maxLength={120}
          />
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Issuer logo (optional)</Label>
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center border-2 border-border bg-muted/30 overflow-hidden">
                {form.issuerLogo ? (
                  <img
                    src={form.issuerLogo}
                    alt={form.issuerLogoAlt.trim() || 'Issuer logo'}
                    title={form.issuerLogoAlt.trim() || undefined}
                    className="size-full object-contain"
                    onError={(ev) => {
                      (ev.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Award className="size-6 text-muted-foreground" />
                )}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCertLogoDialogOpen(true)}
                  disabled={!token}
                  className="px-3 py-1.5 border-2 border-border text-[10px] font-bold uppercase hover:bg-muted/30 disabled:opacity-50"
                >
                  Upload logo
                </button>
                {form.issuerLogo && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, issuerLogo: '', issuerLogoAlt: '' }))}
                    className="px-3 py-1.5 border-2 border-destructive text-destructive text-[10px] font-bold uppercase hover:bg-destructive/10"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Issue date *</Label>
              <div className="flex gap-2">
                <SearchableSelect
                  id="cert-issue-month"
                  label=""
                  placeholder="Month"
                  value={form.issueMonth}
                  onChange={(v) => {
                    setForm((f) => ({ ...f, issueMonth: v }));
                    if (fieldErrors.issueDate)
                      setFieldErrors((e2) => (e2.issueDate ? { ...e2, issueDate: '' } : e2));
                  }}
                  options={MONTH_SELECT_OPTIONS}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                />
                <SearchableSelect
                  id="cert-issue-year"
                  label=""
                  placeholder="Year"
                  value={form.issueYear}
                  onChange={(v) => {
                    setForm((f) => {
                      const iy = parseInt(v || '', 10);
                      const ey = parseInt(f.expYear || '', 10);
                      const nextExpYear =
                        Number.isFinite(iy) && Number.isFinite(ey) && ey < iy ? v : f.expYear;
                      return { ...f, issueYear: v, expYear: nextExpYear };
                    });
                    if (fieldErrors.issueDate)
                      setFieldErrors((e2) => (e2.issueDate ? { ...e2, issueDate: '' } : e2));
                  }}
                  options={YEAR_OPTIONS}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                />
              </div>
              {fieldErrors.issueDate && (
                <p className="text-xs text-destructive font-medium">{fieldErrors.issueDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Expiration date (optional)</Label>
              <div className="flex gap-2">
                <SearchableSelect
                  id="cert-exp-month"
                  label=""
                  placeholder="Month"
                  value={form.expMonth}
                  onChange={(v) => setForm((f) => ({ ...f, expMonth: v }))}
                  options={MONTH_SELECT_OPTIONS}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                />
                <SearchableSelect
                  id="cert-exp-year"
                  label=""
                  placeholder="Year"
                  value={form.expYear}
                  onChange={(v) => setForm((f) => ({ ...f, expYear: v }))}
                  options={yearOptionsFromMin(form.issueYear, PROFILE_CERT_EXPIRATION_END_YEAR)}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                />
              </div>
              {fieldErrors.expirationDate && (
                <p className="text-xs text-destructive font-medium">{fieldErrors.expirationDate}</p>
              )}
            </div>
          </div>
          <FormInput
            id="cert-cred-id"
            label="Credential ID (optional)"
            placeholder="Ex: Certificate number"
            maxLength={80}
            value={form.credentialId}
            onChange={(e) => setForm((f) => ({ ...f, credentialId: e.target.value }))}
          />
          <FormInput
            id="cert-cred-url"
            label="Credential URL (optional)"
            type="url"
            placeholder="Link to verification page"
            maxLength={500}
            value={form.credentialUrl}
            onChange={(e) => setForm((f) => ({ ...f, credentialUrl: e.target.value }))}
          />
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="cert-skills">Skills * (min 1)</Label>
            <Input
              id="cert-skills"
              placeholder="Add skills. Comma (,) or Enter. Min 1, max 30."
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const input = e.target as HTMLInputElement;
                  const raw = input.value;
                  raw
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .forEach(addCertSkill);
                  input.value = '';
                  if (fieldErrors.skills)
                    setFieldErrors((e2) => (e2.skills ? { ...e2, skills: '' } : e2));
                }
              }}
              onBlur={(e) => {
                const v = (e.target as HTMLInputElement).value;
                if (v.includes(',')) {
                  v.split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .forEach(addCertSkill);
                  (e.target as HTMLInputElement).value = '';
                  if (fieldErrors.skills)
                    setFieldErrors((e2) => (e2.skills ? { ...e2, skills: '' } : e2));
                }
              }}
              className={fieldErrors.skills ? 'border-destructive' : ''}
            />
            {fieldErrors.skills && (
              <p className="text-xs text-destructive font-medium">{fieldErrors.skills}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.skills.map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted border border-border text-[10px] font-bold"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, skills: f.skills.filter((_, j) => j !== i) }))
                    }
                    className="hover:text-destructive"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Media (optional)</Label>
            <p className="text-[9px] text-muted-foreground">
              Up to 5 items total (links + images). One URL per line; optional title when adding a
              single URL.
            </p>
            {form.mediaItems.length > 0 && (
              <ul className="space-y-2">
                {form.mediaItems.map((m, i) => (
                  <MediaThumbnailRow
                    key={i}
                    item={m}
                    onPreview={() => setCertFullViewMedia(m)}
                    onRemove={() =>
                      setForm((f) => ({ ...f, mediaItems: f.mediaItems.filter((_, j) => j !== i) }))
                    }
                  />
                ))}
              </ul>
            )}
            {form.mediaItems.length < 5 && (
              <div className="flex flex-col gap-2" ref={certMediaDropdownRef}>
                {certAddMediaDropdownOpen && (
                  <div
                    className="fixed inset-0 z-[99]"
                    aria-hidden
                    onClick={() => setCertAddMediaDropdownOpen(false)}
                  />
                )}
                <div className="relative z-[120] w-fit max-w-full">
                  <button
                    type="button"
                    onClick={() => setCertAddMediaDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border text-[10px] font-bold uppercase hover:bg-muted/30"
                  >
                    <Plus className="size-3" /> Add media{' '}
                    <ChevronDown
                      className={cn('size-3', certAddMediaDropdownOpen && 'rotate-180')}
                    />
                  </button>
                  {certAddMediaDropdownOpen && (
                    <div className="absolute left-0 top-full z-[130] mt-1 min-w-[200px] border-2 border-border bg-card shadow py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCertAddMediaDropdownOpen(false);
                          setCertShowLinkForm(true);
                          if (!certShowLinkForm) {
                            setCertLinkUrl('');
                            setCertLinkTitle('');
                          }
                        }}
                        className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"
                      >
                        <Link2 className="size-4" /> Add link
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCertAddMediaDropdownOpen(false);
                          setCertUploadMediaDialogOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"
                      >
                        <ImagePlus className="size-4" /> Upload media
                      </button>
                    </div>
                  )}
                </div>
                {certShowLinkForm && (
                  <div className="relative z-0 overflow-hidden border-2 border-border bg-muted/10">
                    <div className="flex items-center justify-between gap-2 border-b-2 border-border bg-muted/20 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide">
                        Add link
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCertShowLinkForm(false);
                          setCertLinkUrl('');
                          setCertLinkTitle('');
                        }}
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
                        value={certLinkUrl}
                        onChange={(e) => setCertLinkUrl(e.target.value)}
                        className="min-h-[5rem] resize-y text-sm font-mono"
                        rows={4}
                        autoComplete="off"
                      />
                      <Label className="text-[10px] font-bold uppercase">Title (optional)</Label>
                      <Input
                        placeholder="Single-URL adds only"
                        value={certLinkTitle}
                        onChange={(e) => setCertLinkTitle(e.target.value)}
                        className="text-sm"
                        maxLength={120}
                      />
                      <div className="flex gap-2">
                        <GhostOutlineButton
                          type="button"
                          size="sm"
                          onClick={() => {
                            setCertShowLinkForm(false);
                            setCertLinkUrl('');
                            setCertLinkTitle('');
                          }}
                        >
                          Cancel
                        </GhostOutlineButton>
                        <button
                          type="button"
                          onClick={() => {
                            const { urls, skippedNonEmpty } = parseMediaLinkLineInput(certLinkUrl);
                            if (urls.length === 0) {
                              toast.error(
                                skippedNonEmpty > 0
                                  ? 'No valid URLs. Use https://… or domain.com, one per line.'
                                  : 'Enter at least one URL (one per line).',
                                { id: 'syntax-invalid-url' }
                              );
                              return;
                            }
                            const title = certLinkTitle.trim() || undefined;
                            let nextLen = 0;
                            let added = 0;
                            flushSync(() => {
                              setForm((f) => {
                                const prev = Array.isArray(f.mediaItems) ? f.mediaItems : [];
                                const room = Math.max(0, 5 - prev.length);
                                const slice = urls.slice(0, room);
                                added = slice.length;
                                const titled = slice.map((url, i) => ({
                                  url,
                                  title: slice.length === 1 ? title : i === 0 ? title : undefined,
                                }));
                                const nextItems = [...prev, ...titled];
                                nextLen = nextItems.length;
                                return { ...f, mediaItems: nextItems };
                              });
                            });
                            setCertLinkUrl('');
                            setCertLinkTitle('');
                            setCertShowLinkForm(nextLen < 5);
                            if (skippedNonEmpty > 0) {
                              toast.message(
                                `Skipped ${skippedNonEmpty} line(s) that were not valid URLs.`,
                                { id: 'syntax-skip-url-lines' }
                              );
                            }
                            if (urls.length > added) {
                              toast.message(`Added ${added} link(s); max is 5 media items total.`, {
                                id: 'syntax-max-media',
                              });
                            }
                          }}
                          className={cn(
                            settingsBtnBlockPrimarySm,
                            'px-3 py-1.5 text-[10px] font-bold'
                          )}
                        >
                          Add link(s)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {token && (
            <ImageUploadCropDialog
              open={certUploadMediaDialogOpen}
              onClose={() => setCertUploadMediaDialogOpen(false)}
              titleId="cert-media-crop"
              title="Upload media"
              titleIcon={<ImagePlus className="size-4 shrink-0 text-primary" aria-hidden />}
              subtitle="Square crop · max 5 MB · uploads when you save this certification."
              subtitleClassName="text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
              maxSizeBytes={5 * 1024 * 1024}
              aspect={1}
              confirmLabel="Save & add"
              chooseAnotherLabel="Choose another"
              onConfirm={async (file) => {
                if (!token) throw new Error('Not signed in.');
                const url = URL.createObjectURL(file);
                const title = buildUploadImageMeta(file.name, user?.username ?? 'user').title;
                setForm((f) => ({
                  ...f,
                  mediaItems: [
                    ...f.mediaItems,
                    { url, title, isPending: true, pendingFile: file },
                  ].slice(0, 5),
                }));
                toast.success('Media staged. It will upload when you save.');
              }}
            />
          )}
          <FormTextarea
            id="cert-desc"
            label="Description (optional)"
            placeholder="Topics, skills validated"
            maxLength={2000}
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))}
          />
        </div>
      </FormDialog>
    </SettingsTabRoot>
  );
}
