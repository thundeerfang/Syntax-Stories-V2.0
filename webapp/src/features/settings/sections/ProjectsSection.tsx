'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  FileText,
  BookOpen,
  FolderGit2,
  ChevronDown,
  Plus,
  Link2,
  ImagePlus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { settingsBtnBlockPrimarySm } from '@/app/settings/buttonStyles';
import { useSettingsAuthSlice } from '@/hooks/useSettingsAuthSlice';
import { MediaFullViewDialog } from '@/features/profile';
import { ImageUploadCropDialog } from '@/components/upload';
import { FormDialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/dialog';
import { GhostOutlineButton } from '@/components/ui';
import {
  Toggle,
  FormInput,
  FormTextarea,
  FormCheckbox,
  Input,
  Label,
  SearchableSelect,
  Textarea,
} from '@/components/retroui';
import { ProjectCard } from '@/components/settings-list/ProjectCard';
import { SettingsSectionHeader } from '@/app/settings/settings-list/Header';
import { SettingsTabPanel, SettingsTabRoot } from '@/app/settings/settings-list/SettingsSectionHeading';
import {
  MONTH_SELECT_OPTIONS,
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
} from '../lib/workExperienceForm';



type ProjectType = 'project' | 'publication';
type ProjectForm = {
  type: ProjectType;
  title: string;
  publisher: string;
  ongoing: boolean;
  publicationDate: string;
  endDate: string;
  publicationMonth: string;
  publicationYear: string;
  endMonth: string;
  endYear: string;
  publicationUrl: string;
  description: string;
  mediaItems: MediaItem[];
};
const PROJECT_DEFAULT: ProjectForm = {
  type: 'project',
  title: '', publisher: '', ongoing: false, publicationDate: '', endDate: '', publicationMonth: '', publicationYear: '', endMonth: '', endYear: '', publicationUrl: '', description: '', mediaItems: [],
};

export function ProjectsContent() {
  const { user, updateProfile, token } = useSettingsAuthSlice();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fullProjects = user?.projects ?? [];
  const isGithubProject = (p: unknown) => (p as { source?: string }).source === 'github';
  const githubProjects = fullProjects.filter(isGithubProject);
  const nonGithubProjects = fullProjects.filter((p) => !isGithubProject(p));
  const list = nonGithubProjects.map((p) => {
    const pub = valueToMonthYear(p.publicationDate ?? '');
    const end = valueToMonthYear(p.endDate ?? '');
    const rawType = (p as { type?: string }).type;
    const type: ProjectType = rawType === 'publication' ? 'publication' : 'project';
    return {
      type,
      title: p.title ?? (p as { name?: string }).name ?? '',
      publisher: p.publisher ?? '',
      ongoing: !!p.ongoing,
      publicationDate: p.publicationDate ?? '',
      endDate: p.endDate ?? '',
      publicationMonth: pub.month,
      publicationYear: pub.year,
      endMonth: end.month,
      endYear: end.year,
      publicationUrl: p.publicationUrl ?? (p as { url?: string }).url ?? '',
      description: p.description ?? '',
      mediaItems: ((p as { media?: MediaItem[] }).media ?? []).map((m) => ({ url: m.url, title: m.title })),
    };
  });
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<ProjectForm>(PROJECT_DEFAULT);
  const [initialForm, setInitialForm] = useState<ProjectForm>(PROJECT_DEFAULT);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [projAddMediaDropdownOpen, setProjAddMediaDropdownOpen] = useState(false);
  const [projShowLinkForm, setProjShowLinkForm] = useState(false);
  const [projUploadMediaDialogOpen, setProjUploadMediaDialogOpen] = useState(false);
  const [projLinkUrl, setProjLinkUrl] = useState('');
  const [projLinkTitle, setProjLinkTitle] = useState('');
  const [projFullViewMedia, setProjFullViewMedia] = useState<MediaItem | null>(null);
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(null);
  const projMediaDropdownRef = useRef<HTMLDivElement>(null);
  const hasFormChanged = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projMediaDropdownRef.current && !projMediaDropdownRef.current.contains(e.target as Node)) setProjAddMediaDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openAdd = () => { setForm(PROJECT_DEFAULT); setInitialForm(PROJECT_DEFAULT); setEditingIndex(null); setFieldErrors({}); setDialogOpen(true); };
  const openEdit = useCallback((i: number) => {
    const item = list[i];
    const next: ProjectForm = { ...PROJECT_DEFAULT, ...item, type: item.type };
    setForm(next);
    setInitialForm(next);
    setEditingIndex(i);
    setFieldErrors({});
    setDialogOpen(true);
  }, [list]);
  const openedEditFromUrlRefProj = useRef(false);
  useEffect(() => {
    if (openedEditFromUrlRefProj.current || list.length === 0) return;
    const edit = searchParams.get('edit');
    if (edit == null) return;
    const idx = parseInt(edit, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= list.length) return;
    openedEditFromUrlRefProj.current = true;
    openEdit(idx);
    router.replace('/settings', { scroll: false });
  }, [list.length, openEdit, router, searchParams]);
  const remove = async (i: number) => {
    const next = [...githubProjects, ...nonGithubProjects.filter((_, idx) => idx !== i)];
    setSaving(true);
    try {
      await updateProfile({ projects: next }, { section: 'projects' });
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
    if (!form.title.trim()) err.title = 'Title is required.';
    const pubDateVal = monthYearToValue(form.publicationMonth, form.publicationYear);
    if (!pubDateVal) err.publicationDate = 'Publication date is required.';
    if (Object.keys(err).length) { setFieldErrors(err); toast.error('Please fix the errors below.', { id: 'syntax-form-errors' }); return; }
    setFieldErrors({});
    const endDateVal = form.ongoing ? undefined : (monthYearToValue(form.endMonth, form.endYear) || undefined);
    let resolvedProjMedia: { url: string; title?: string }[];
    try {
      resolvedProjMedia = await resolveProfileMediaItems(token, form.mediaItems);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to upload media.', { id: 'syntax-media-upload' });
      return;
    }
    const entry = {
      type: form.type,
      title: form.title.trim().slice(0, 120),
      publisher: form.publisher.trim().slice(0, 120) || undefined,
      ongoing: form.ongoing,
      publicationDate: pubDateVal,
      endDate: endDateVal,
      publicationUrl: form.publicationUrl.trim().slice(0, 500) || undefined,
      description: form.description.trim().slice(0, 2000) || undefined,
      media: resolvedProjMedia,
    };
    const next = editingIndex !== null
      ? [...githubProjects, ...nonGithubProjects.map((p, j) => (j === editingIndex ? entry : p))]
      : [...fullProjects, entry];
    setSaving(true);
    try {
      await updateProfile({ projects: next }, { section: 'projects' });
      toast.success(editingIndex !== null ? 'Updated.' : 'Added.', { id: 'syntax-project-entry-success' });
      setDialogOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <SettingsTabRoot>
      <SettingsSectionHeader variant="projects" onPrimaryAction={openAdd} disabled={saving} />
      <SettingsTabPanel>
      <FormSection>
        {list.length === 0 ? (
          <SettingsSectionEmptyState
            icon={FolderGit2}
            title="No projects or publications yet"
            tagline="Share what you've built or published. Add your first project to get started."
          />
        ) : (
          <>
            {list.map((e, i) => (
              <ProjectCard
                key={i}
                project={e}
                index={i}
                saving={saving}
                onEdit={() => openEdit(i)}
                onRemove={() => setRemoveConfirmIndex(i)}
                onPreviewMedia={(item) => setProjFullViewMedia(item)}
                formatMonthYear={formatMonthYearMedium}
                domainFromUrl={domainFromUrl}
                isImageUrl={isImageUrl}
              />
            ))}
          </>
        )}
      </FormSection>
      </SettingsTabPanel>
      <ConfirmDialog
        open={removeConfirmIndex !== null}
        onClose={() => setRemoveConfirmIndex(null)}
        title="Remove project"
        message="This entry will be removed from your profile. You can add it again later."
        confirmLabel="Remove"
        variant="danger"
        loading={saving}
        onConfirm={() => { if (removeConfirmIndex !== null) { remove(removeConfirmIndex); setRemoveConfirmIndex(null); } }}
      />
      <MediaFullViewDialog
        open={!!projFullViewMedia}
        onClose={() => setProjFullViewMedia(null)}
        src={projFullViewMedia?.url ?? ''}
        title={projFullViewMedia?.title}
      />
      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        titleIcon={<FileText aria-hidden />}
        title="Projects & publications"
        titleId="proj-dialog"
        subtitle="Title, publisher, and publication date."
        headerRight={
          <div className="flex border-2 border-border bg-muted/20 p-0.5 gap-0.5 shadow">
            <Toggle
              pressed={form.type === 'project'}
              onPressedChange={(p) => p && setForm((f) => ({ ...f, type: 'project' }))}
              className="min-w-0 px-3 py-1.5 border-0"
            >
              <FolderGit2 className="size-3.5 shrink-0" /> Project
            </Toggle>
            <Toggle
              pressed={form.type === 'publication'}
              onPressedChange={(p) => p && setForm((f) => ({ ...f, type: 'publication' }))}
              className="min-w-0 px-3 py-1.5 border-0"
            >
              <BookOpen className="size-3.5 shrink-0" /> Publication
            </Toggle>
          </div>
        }
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
          <FormInput id="proj-title" label="Title *" placeholder="Ex: Building Scalable APIs with Go" maxLength={120} value={form.title} error={fieldErrors.title} onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); if (fieldErrors.title) setFieldErrors((e2) => (e2.title ? { ...e2, title: '' } : e2)); }} />
          <FormInput id="proj-pub" label="Publisher *" placeholder="Publisher name" maxLength={120} value={form.publisher} onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))} />
          <FormCheckbox
            id="proj-ongoing"
            label="Ongoing project/publication"
            checked={form.ongoing}
            onCheckedChange={(v) => setForm((f) => ({ ...f, ongoing: v, ...(v ? { endMonth: '', endYear: '' } : {}) }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Publication date *</Label>
              <div className="flex gap-2">
                <SearchableSelect id="proj-pub-month" label="" placeholder="Month" value={form.publicationMonth} onChange={(v) => { setForm((f) => ({ ...f, publicationMonth: v })); if (fieldErrors.publicationDate) setFieldErrors((e2) => (e2.publicationDate ? { ...e2, publicationDate: '' } : e2)); }} options={MONTH_SELECT_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" />
                <SearchableSelect id="proj-pub-year" label="" placeholder="Year" value={form.publicationYear} onChange={(v) => setForm((f) => ({ ...f, publicationYear: v }))} options={YEAR_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" />
              </div>
              {fieldErrors.publicationDate && <p className="text-xs text-destructive font-medium">{fieldErrors.publicationDate}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">End date</Label>
              <div className="flex gap-2">
                <SearchableSelect id="proj-end-month" label="" placeholder="Month" value={form.endMonth} onChange={(v) => setForm((f) => ({ ...f, endMonth: v }))} options={MONTH_SELECT_OPTIONS} listMaxHeight={220} widthClass="flex-1 min-w-0" disabled={form.ongoing} />
                <SearchableSelect id="proj-end-year" label="" placeholder="Year" value={form.endYear} onChange={(v) => setForm((f) => ({ ...f, endYear: v }))} options={yearOptionsFromMin(form.publicationYear)} listMaxHeight={220} widthClass="flex-1 min-w-0" disabled={form.ongoing} />
              </div>
              {form.ongoing && <p className="text-[9px] text-muted-foreground">Disabled for ongoing projects.</p>}
            </div>
          </div>
          <FormInput id="proj-url" label="Publication URL / Media link" type="url" placeholder="https://example.com/page" maxLength={500} value={form.publicationUrl} onChange={(e) => setForm((f) => ({ ...f, publicationUrl: e.target.value }))} />
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Media (optional, max 5)</Label>
            <p className="text-[9px] text-muted-foreground">
              Links and images share the limit. One URL per line; optional title when adding a single URL.
            </p>
            {form.mediaItems.length > 0 && (
              <ul className="space-y-2">
                {form.mediaItems.map((m, i) => (
                  <MediaThumbnailRow
                    key={i}
                    item={m}
                    onPreview={() => setProjFullViewMedia(m)}
                    onRemove={() => setForm((f) => ({ ...f, mediaItems: f.mediaItems.filter((_, j) => j !== i) }))}
                  />
                ))}
              </ul>
            )}
            {form.mediaItems.length < 5 && (
              <div className="flex flex-col gap-2" ref={projMediaDropdownRef}>
                {projAddMediaDropdownOpen && <div className="fixed inset-0 z-[99]" aria-hidden onClick={() => setProjAddMediaDropdownOpen(false)} />}
                <div className="relative z-[120] w-fit max-w-full">
                  <button
                    type="button"
                    onClick={() => setProjAddMediaDropdownOpen((o) => !o)}
                    className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-border text-[10px] font-bold uppercase hover:bg-muted/30"
                  >
                    <Plus className="size-3" /> Add media <ChevronDown className={cn('size-3', projAddMediaDropdownOpen && 'rotate-180')} />
                  </button>
                  {projAddMediaDropdownOpen && (
                    <div className="absolute left-0 top-full z-[130] mt-1 min-w-[200px] border-2 border-border bg-card shadow py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProjAddMediaDropdownOpen(false);
                          setProjShowLinkForm(true);
                          if (!projShowLinkForm) {
                            setProjLinkUrl('');
                            setProjLinkTitle('');
                          }
                        }}
                        className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"
                      >
                        <Link2 className="size-4" /> Add link
                      </button>
                      <button type="button" onClick={() => { setProjAddMediaDropdownOpen(false); setProjUploadMediaDialogOpen(true); }} className="w-full px-3 py-2 text-left text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-muted/50"><ImagePlus className="size-4" /> Upload media</button>
                    </div>
                  )}
                </div>
                {projShowLinkForm && (
                  <div className="relative z-0 overflow-hidden border-2 border-border bg-muted/10">
                    <div className="flex items-center justify-between gap-2 border-b-2 border-border bg-muted/20 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide">Add link</span>
                      <button
                        type="button"
                        onClick={() => { setProjShowLinkForm(false); setProjLinkUrl(''); setProjLinkTitle(''); }}
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
                        value={projLinkUrl}
                        onChange={(e) => setProjLinkUrl(e.target.value)}
                        className="min-h-[5rem] resize-y text-sm font-mono"
                        rows={4}
                        autoComplete="off"
                      />
                      <Label className="text-[10px] font-bold uppercase">Title (optional)</Label>
                      <Input placeholder="Single-URL adds only" value={projLinkTitle} onChange={(e) => setProjLinkTitle(e.target.value)} className="text-sm" maxLength={120} />
                      <div className="flex gap-2">
                        <GhostOutlineButton type="button" size="sm" onClick={() => { setProjShowLinkForm(false); setProjLinkUrl(''); setProjLinkTitle(''); }}>Cancel</GhostOutlineButton>
                        <button
                          type="button"
                          onClick={() => {
                            const { urls, skippedNonEmpty } = parseMediaLinkLineInput(projLinkUrl);
                            if (urls.length === 0) {
                              toast.error(
                                skippedNonEmpty > 0
                                  ? 'No valid URLs. Use https://… or domain.com, one per line.'
                                  : 'Enter at least one URL (one per line).',
                                { id: 'syntax-invalid-url' }
                              );
                              return;
                            }
                            const title = projLinkTitle.trim() || undefined;
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
                            setProjLinkUrl('');
                            setProjLinkTitle('');
                            setProjShowLinkForm(nextLen < 5);
                            if (skippedNonEmpty > 0) {
                              toast.message(`Skipped ${skippedNonEmpty} line(s) that were not valid URLs.`, { id: 'syntax-skip-url-lines' });
                            }
                            if (urls.length > added) {
                              toast.message(`Added ${added} link(s); max is 5 media items total.`, { id: 'syntax-max-media' });
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
            )}
          </div>
          {token && (
            <ImageUploadCropDialog
              open={projUploadMediaDialogOpen}
              onClose={() => setProjUploadMediaDialogOpen(false)}
              titleId="project-media-crop"
              title="Upload media"
              titleIcon={<ImagePlus className="size-4 shrink-0 text-primary" aria-hidden />}
              subtitle="Square crop · max 5 MB · uploads when you save this entry."
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
                setForm((f) => ({ ...f, mediaItems: [...f.mediaItems, { url, title, isPending: true, pendingFile: file }].slice(0, 5) }));
                toast.success('Media staged. It will upload when you save.');
              }}
            />
          )}
          <FormTextarea id="proj-desc" label="Description — Summary of the work" placeholder="Summary of the work" maxLength={2000} rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))} />
        </div>
      </FormDialog>
    </SettingsTabRoot>
  );
}
