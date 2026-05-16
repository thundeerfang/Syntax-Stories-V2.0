'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  User,
  CreditCard,
  Briefcase,
  GraduationCap,
  Award,
  Bell,
  Tag,
  Plug,
  ShieldCheck,
  FileText,
  BookOpen,
  Wallet,
  LogOut,
  Camera,
  FolderGit2,
  Settings,
  ChevronDown,
  Mail,
  Monitor,
  Wrench,
  Plus,
  Check,
  Link2,
  ImagePlus,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Sigma,
  LinkedinIcon,
  Github,
  Instagram,
  Youtube,
  ExternalLink,
  X,
  Pencil,
  Trash2,
  TrendingUp,
  Search,
  SearchX,
  Building2,
  Globe,
  Loader2,
  Image as LucideImage,
  Flame,
} from 'lucide-react';
import { PROVIDER_ICONS } from '@/components/icons/SocialProviderIcons';
import { OptimizedRemoteImage } from '@/components/ui/media';
import { cn } from '@/lib/core/utils';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { STACK_AND_TOOLS_MAX } from '@/lib/profile/stackAndToolsLimits';
import {
  PROFILE_INSTAGRAM_MAX,
  PROFILE_PORTFOLIO_URL_MAX,
  PROFILE_PORTFOLIO_URL_MIN,
  PROFILE_SOCIAL_URL_MAX,
  PROFILE_SOCIAL_URL_MIN,
  STACK_TOOL_NAME_MAX,
  STACK_TOOL_NAME_MIN,
} from '@/lib/profile/profileLinkLimits';
import {
  settingsBtnBlockPrimaryMd,
  settingsBtnBlockPrimarySm,
  settingsBtnIconFab,
} from '@/app/settings/buttonStyles';
import { GithubNotConnectedDialog } from '@/app/settings/GithubNotConnectedDialog';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuthStore } from '@/store/auth';
import { useSettingsAuthSlice } from '@/hooks/useSettingsAuthSlice';
import { authApi } from '@/api/auth';
import { projectMatchesGithubRepo } from '@/lib/profile/githubProjectIdentity';
import { markOAuthNavigationPending } from '@/lib/auth/oauthNavigation';
import { UploadLogoDialog, MediaFullViewDialog, SyntaxCardDialog } from '@/features/profile';
import { ImageUploadCropDialog } from '@/components/upload';
import { uploadAvatar, uploadCover, uploadMedia } from '@/api/upload';
import { FormDialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/dialog';
import { GhostOutlineButton } from '@/components/ui';
import { GithubConnectLottie } from '@/components/ui/lottie';
import { HoverCard } from '@/components/ui/popover';
import { LinkPreviewCardContent } from '@/components/ui/popover';
import { Dialog } from '@/components/ui/dialog';
import { getSkillIconUrl, getSkillIconUrlBySlug, preloadSkillIcons } from '@/lib/profile/skillIcons';
import { SkillIconImage } from '@/components/ui/media';
import { searchTechStack, type TechStackItem } from '@/lib/blog/referenceSearch';
import { Toggle, ToggleGroup, ToggleGroupItem, FormInput, FormTextarea, FormCheckbox, Input, Label, SearchableSelect, EntitySearchInput, Textarea } from '@/components/retroui';
import { getCountryOptions, getStateOptions, getCityOptions, buildLocationString, parseLocationString } from '@/lib/profile/profileLocation';
import { searchCompaniesWithApi, searchSchools, searchOrganizations } from '@/lib/blog/referenceSearch';
import { WorkExperienceCard } from '@/app/settings/settings-list/WorkExperienceCard';
import { EducationCard } from '@/app/settings/settings-list/EducationCard';
import { CertificationCard } from '@/app/settings/settings-list/CertificationCard';
import { ProjectCard } from '@/app/settings/settings-list/ProjectCard';
import { OpenSourceCard } from '@/app/settings/settings-list/OpenSourceCard';
import { type SetupItem as MySetupItem } from '@/app/settings/settings-list/MySetupCard';
import { SettingsSectionHeader } from '@/app/settings/settings-list/Header';
import {
  SettingsSectionHeading,
  SettingsTabPanel,
  SettingsTabRoot,
} from '@/app/settings/settings-list/SettingsSectionHeading';
import { SettingsContentSkeleton, SettingsSidebarSkeleton, StackToolsSettingsSkeleton } from '@/components/skeletons';
import { PaymentsSettingsContent } from '@/app/settings/PaymentsSettingsContent';
import { BlogStreakSettingsContent } from '@/app/settings/BlogStreakSettingsContent';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  LOCATION_TYPE_SELECT_OPTIONS,
} from '@syntax-stories/shared';
import {
  MONTH_SELECT_OPTIONS,
  formatMonthYearMedium,
  monthYearToValue,
  profileYearOptions,
  valueToMonthYear,
  yearOptionsFromMin,
} from '@/lib/profile/dateLabels';
import {
  SETTINGS_ACCORDION_VARIANTS,
  SETTINGS_IMPLEMENTED_SECTION_IDS,
  SETTINGS_NAV_GROUPS,
} from '../config/nav';
import { SettingsSectionEmptyState } from '../components/SettingsSectionEmptyState';
import { FormSection } from '../components/FormSection';
import { SettingsComingSoonPlaceholder } from '../components/SettingsComingSoonPlaceholder';
import { YEAR_OPTIONS } from '../lib/workExperienceForm';

type EducationForm = {
  school: string;
  schoolDomain: string;
  schoolLogo: string;
  schoolLogoAlt: string;
  degree: string;
  fieldOfStudy: string;
  currentEducation: boolean;
  startDate: string;
  endDate: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  grade: string;
  description: string;
  activity: string;
};

const EDUCATION_DEFAULT: EducationForm = {
  school: '',
  schoolDomain: '',
  schoolLogo: '',
  schoolLogoAlt: '',
  degree: '',
  fieldOfStudy: '',
  currentEducation: false,
  startDate: '',
  endDate: '',
  startMonth: '',
  startYear: '',
  endMonth: '',
  endYear: '',
  grade: '',
  description: '',
  activity: '',
};

export function EducationContent() {
  const { user, updateProfile, token } = useSettingsAuthSlice();
  const router = useRouter();
  const searchParams = useSearchParams();
  const list = (user?.education ?? []).map((e) => {
    const start = valueToMonthYear(e.startDate ?? '');
    const end = valueToMonthYear(e.endDate ?? '');
    return {
      school: e.school ?? '',
      schoolDomain: e.schoolDomain ?? '',
      schoolLogo: (e as { schoolLogo?: string }).schoolLogo ?? '',
      schoolLogoAlt: (e as { schoolLogoAlt?: string }).schoolLogoAlt ?? '',
      degree: e.degree ?? '',
      fieldOfStudy: e.fieldOfStudy ?? (e as { field?: string }).field ?? '',
      currentEducation: !!e.currentEducation,
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
      startMonth: start.month,
      startYear: start.year,
      endMonth: end.month,
      endYear: end.year,
      grade: e.grade ?? '',
      description: e.description ?? '',
      activity: (e as { activity?: string }).activity ?? '',
    };
  });
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(null);
  const [form, setForm] = useState<EducationForm>(EDUCATION_DEFAULT);
  const [initialForm, setInitialForm] = useState<EducationForm>(EDUCATION_DEFAULT);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [schoolLogoDialogOpen, setSchoolLogoDialogOpen] = useState(false);
  const hasFormChanged = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
  const openAdd = () => { setForm(EDUCATION_DEFAULT); setInitialForm(EDUCATION_DEFAULT); setEditingIndex(null); setFieldErrors({}); setDialogOpen(true); };
  const openEdit = useCallback((i: number) => {
    const next = { ...EDUCATION_DEFAULT, ...list[i] };
    setForm(next);
    setInitialForm(next);
    setEditingIndex(i);
    setFieldErrors({});
    setDialogOpen(true);
  }, [list]);
  const openedEditFromUrlRefEd = useRef(false);
  useEffect(() => {
    if (openedEditFromUrlRefEd.current || list.length === 0) return;
    const edit = searchParams.get('edit');
    if (edit == null) return;
    const idx = parseInt(edit, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= list.length) return;
    openedEditFromUrlRefEd.current = true;
    openEdit(idx);
    router.replace('/settings', { scroll: false });
  }, [list.length, openEdit, router, searchParams]);
  const remove = async (i: number) => {
    const next = list.filter((_, idx) => idx !== i).map((e) => ({
      school: e.school,
      schoolDomain: e.schoolDomain,
      schoolLogo: e.schoolLogo,
      schoolLogoAlt: e.schoolLogoAlt,
      degree: e.degree,
      fieldOfStudy: e.fieldOfStudy,
      currentEducation: e.currentEducation,
      startDate: e.startDate,
      endDate: e.endDate,
      grade: e.grade,
      description: e.description,
      activity: e.activity,
    }));
    setSaving(true);
    try {
      await updateProfile({ education: next }, { section: 'education' });
      toast.success('Removed.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };
  const submitDialog = async () => {
    if (!hasFormChanged) {
      toast.error('No changes to save.', { id: 'syntax-no-changes' });
      return;
    }
    const err: Record<string, string> = {};
    if (!form.school.trim()) err.school = 'School name is required.';
    if (!form.degree.trim()) err.degree = 'Degree is required.';
    const startDateVal = monthYearToValue(form.startMonth, form.startYear);
    if (!startDateVal) err.startDate = 'Start date is required.';
    if (!form.currentEducation) {
      const endDateVal = monthYearToValue(form.endMonth, form.endYear);
      if (!endDateVal) err.endDate = 'End date is required when not currently enrolled.';
      else if (startDateVal && endDateVal < startDateVal) err.endDate = 'End date cannot be earlier than start date.';
    }
    if (Object.keys(err).length) { setFieldErrors(err); toast.error('Please fix the errors below.', { id: 'syntax-form-errors' }); return; }
    setFieldErrors({});
    const endDateVal = form.currentEducation ? undefined : (monthYearToValue(form.endMonth, form.endYear) || undefined);
    const entry = {
      school: form.school.trim(),
      schoolDomain: form.schoolDomain.trim().slice(0, 120) || undefined,
      schoolLogo: form.schoolLogo.trim() || undefined,
      schoolLogoAlt: form.schoolLogoAlt.trim() || undefined,
      degree: form.degree.trim().slice(0, 80),
      fieldOfStudy: form.fieldOfStudy.trim().slice(0, 120) || undefined,
      currentEducation: form.currentEducation,
      startDate: startDateVal,
      endDate: endDateVal,
      grade: form.grade.trim().slice(0, 80) || undefined,
      activity: form.activity.trim().slice(0, 500) || undefined,
      description: form.description?.trim().slice(0, 2000) || undefined,
    };
    const next = editingIndex !== null ? list.map((e, i) => (i === editingIndex ? entry : e)) : [...list, entry];
    setSaving(true);
    try {
      await updateProfile({ education: next }, { section: 'education' });
      toast.success(editingIndex !== null ? 'Updated.' : 'Added.', { id: 'syntax-education-entry-success' });
      setDialogOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <SettingsTabRoot>
      <SettingsSectionHeader variant="education" onPrimaryAction={openAdd} disabled={saving} />
      <SettingsTabPanel>
      <FormSection>
        {list.length === 0 ? (
          <SettingsSectionEmptyState
            icon={GraduationCap}
            title="No education added yet"
            tagline="Add your degrees and schools. Help others see your learning journey."
          />
        ) : (
          <>
            {list.map((e, i) => {
              return (
                <EducationCard
                  key={i}
                  education={e}
                  index={i}
                  saving={saving}
                  onEdit={() => openEdit(i)}
                  onRemove={() => setRemoveConfirmIndex(i)}
                  formatMonthYear={formatMonthYearMedium}
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
        title="Remove education"
        message="This entry will be removed from your profile. You can add it again later."
        confirmLabel="Remove"
        variant="danger"
        loading={saving}
        onConfirm={() => { if (removeConfirmIndex !== null) { remove(removeConfirmIndex); setRemoveConfirmIndex(null); } }}
      />
      {token ? (
        <UploadLogoDialog
          open={schoolLogoDialogOpen}
          onClose={() => setSchoolLogoDialogOpen(false)}
          token={token}
          kind="school-logo"
          onSuccess={({ url, imageTitle }) => {
            setForm((f) => ({
              ...f,
              schoolLogo: url,
              schoolLogoAlt: imageTitle ?? '',
            }));
            setSchoolLogoDialogOpen(false);
          }}
        />
      ) : null}
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        titleIcon={<GraduationCap aria-hidden />}
        title="Education"
        titleId="edu-dialog"
        subtitle="School, degree, and dates. Add activity or grade if needed."
        panelClassName="max-w-2xl"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">* Required fields</p>
            <div className="flex gap-3">
              <GhostOutlineButton type="button" onClick={() => setDialogOpen(false)}>Cancel</GhostOutlineButton>
              <button type="button" onClick={submitDialog} disabled={saving || !hasFormChanged} className={cn(settingsBtnBlockPrimarySm, 'px-5 py-2.5 text-xs tracking-wide')}>{saving ? 'Saving…' : hasFormChanged ? 'Confirm changes' : 'Save'}</button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <EntitySearchInput
            id="edu-school"
            label="School name *"
            placeholder="Type school name (e.g. MIT)"
            value={form.school}
            onChange={(v) => { setForm((f) => ({ ...f, school: v })); if (fieldErrors.school) setFieldErrors((e2) => (e2.school ? { ...e2, school: '' } : e2)); }}
            onDomainSelect={(d) => setForm((f) => ({ ...f, schoolDomain: d }))}
            searchOptions={searchSchools}
            error={fieldErrors.school}
            maxLength={200}
          />
          <FormInput id="edu-domain" label="School domain (optional)" placeholder="Ex: university.edu" maxLength={120} value={form.schoolDomain} onChange={(e) => setForm((f) => ({ ...f, schoolDomain: e.target.value.slice(0, 120) }))} />
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">School logo (optional)</Label>
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center border-2 border-border bg-muted/30 overflow-hidden">
                {form.schoolLogo ? (
                  <img
                    src={form.schoolLogo}
                    alt={form.schoolLogoAlt.trim() || 'School logo'}
                    title={form.schoolLogoAlt.trim() || undefined}
                    className="size-full object-contain"
                    onError={(ev) => {
                      (ev.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <GraduationCap className="size-6 text-muted-foreground" />
                )}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSchoolLogoDialogOpen(true)}
                  disabled={!token}
                  className="px-3 py-1.5 border-2 border-border text-[10px] font-bold uppercase hover:bg-muted/30 disabled:opacity-50"
                >
                  Upload logo
                </button>
                {form.schoolLogo && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, schoolLogo: '', schoolLogoAlt: '' }))}
                    className="px-3 py-1.5 border-2 border-destructive text-destructive text-[10px] font-bold uppercase hover:bg-destructive/10"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
         
          </div>
          <FormInput id="edu-degree" label="Degree *" placeholder="Ex: Bachelor, Master, PhD, Diploma" maxLength={80} value={form.degree} error={fieldErrors.degree} onChange={(e) => { setForm((f) => ({ ...f, degree: e.target.value })); if (fieldErrors.degree) setFieldErrors((e2) => (e2.degree ? { ...e2, degree: '' } : e2)); }} />
          <FormInput id="edu-field" label="Field of study (optional)" placeholder="Ex: Science in Computer Science" maxLength={120} value={form.fieldOfStudy} onChange={(e) => setForm((f) => ({ ...f, fieldOfStudy: e.target.value }))} />
          <FormCheckbox id="edu-current" label="I'm currently pursuing this" checked={form.currentEducation} onCheckedChange={(v) => setForm((f) => ({ ...f, currentEducation: v, ...(v ? { endMonth: '', endYear: '' } : {}) }))} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Start date *</Label>
              <div className="flex gap-2">
                <SearchableSelect id="edu-start-month" label="" placeholder="Month" value={form.startMonth} onChange={(v) => { setForm((f) => ({ ...f, startMonth: v })); if (fieldErrors.startDate) setFieldErrors((e2) => (e2.startDate ? { ...e2, startDate: '' } : e2)); }} options={MONTH_SELECT_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" />
                <SearchableSelect
                  id="edu-start-year"
                  label=""
                  placeholder="Year"
                  value={form.startYear}
                  onChange={(v) => {
                    setForm((f) => {
                      const sy = parseInt(v || '', 10);
                      const ey = parseInt(f.endYear || '', 10);
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
              <Label className="text-[10px] font-bold uppercase">End date{!form.currentEducation ? ' *' : ''}</Label>
              <div className="flex gap-2">
                <SearchableSelect id="edu-end-month" label="" placeholder="Month" value={form.endMonth} onChange={(v) => { setForm((f) => ({ ...f, endMonth: v })); if (fieldErrors.endDate) setFieldErrors((e2) => (e2.endDate ? { ...e2, endDate: '' } : e2)); }} options={MONTH_SELECT_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" disabled={form.currentEducation} />
                <SearchableSelect
                  id="edu-end-year"
                  label=""
                  placeholder="Year"
                  value={form.endYear}
                  onChange={(v) => { setForm((f) => ({ ...f, endYear: v })); if (fieldErrors.endDate) setFieldErrors((e2) => (e2.endDate ? { ...e2, endDate: '' } : e2)); }}
                  options={yearOptionsFromMin(form.startYear)}
                  listMaxHeight={220}
                  widthClass="flex-1 min-w-0"
                  disabled={form.currentEducation}
                />
              </div>
              {fieldErrors.endDate && <p className="text-xs text-destructive font-medium">{fieldErrors.endDate}</p>}
              {form.currentEducation && !fieldErrors.endDate && <p className="text-[9px] text-muted-foreground">Disabled while currently pursuing</p>}
            </div>
          </div>
          <FormInput id="edu-grade" label="Grade (optional)" placeholder="Ex: 3.8/4.0, First Class Honours" maxLength={80} value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value.slice(0, 80) }))} />
          <FormTextarea id="edu-activity" label="Activity (optional)" placeholder="Clubs, hackathons, projects" maxLength={500} rows={2} value={form.activity} onChange={(e) => setForm((f) => ({ ...f, activity: e.target.value.slice(0, 500) }))} />
        </div>
      </FormDialog>
    </SettingsTabRoot>
  );
}

