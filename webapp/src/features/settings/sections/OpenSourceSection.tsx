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

type OpenSourceGitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  owner: { login: string };
  archived?: boolean;
};

export function OpenSourceContent() {
  const { user, updateProfile, token } = useSettingsAuthSlice();
  const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '') : '';
  const MAX_OPEN_SOURCE_REPOS = 7;

  const imported = (user?.projects ?? []).filter((p) => (p as { source?: string }).source === 'github');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [githubConnectPromptOpen, setGithubConnectPromptOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [repos, setRepos] = useState<OpenSourceGitHubRepo[]>([]);
  const [query, setQuery] = useState('');

  const fetchRepos = async () => {
    if (!token) return;
    if (!user?.isGitAccount) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/github/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string; repos?: OpenSourceGitHubRepo[] } | null;
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to fetch repos.');
      setRepos((data.repos ?? []).filter((r) => !r.archived));
    } catch (e) {
      setRepos([]);
      setError(e instanceof Error ? e.message : 'Failed to fetch repos.');
    } finally {
      setLoading(false);
    }
  };

  const openImportDialog = () => {
    if (!user?.isGitAccount) {
      setGithubConnectPromptOpen(true);
      return;
    }
    setDialogOpen(true);
    void fetchRepos();
  };

  const addRepo = async (fullName: string) => {
    if (!token) return;
    if (!user?.isGitAccount) return;
    if (imported.length >= MAX_OPEN_SOURCE_REPOS) {
      toast.error(`You can link up to ${MAX_OPEN_SOURCE_REPOS} repositories. Remove one to add another.`);
      return;
    }
    if ((user?.projects ?? []).some((p) => projectMatchesGithubRepo(p, fullName))) {
      toast.error('Already in projects.', { id: 'syntax-repo-duplicate' });
      return;
    }
    setSaving(true);
    try {
      const data = await authApi.importGithubReposBatch(token, [fullName]);
      if (!data.success) throw new Error(data.message || 'Failed to import repo.');
      const proj = data.projects?.[0];
      if (!proj) {
        const f = data.failed?.find((x) => x.fullName === fullName);
        throw new Error(f?.message || 'Failed to load repo.');
      }
      const next = [...(user?.projects ?? []), proj as any];
      // Preserve GitHub-linked state so Connected accounts and sync dialog stay in sync.
      // Cast to any because auth flags live on the outer user object, while updateProfile
      // helper is typed for profile fields only.
      await updateProfile({ projects: next, isGitAccount: true }, { section: 'projects' });
      toast.success('Added to projects.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const removeImported = async (repoFullName: string) => {
    const next = (user?.projects ?? []).filter((p) => !projectMatchesGithubRepo(p, repoFullName));
    setSaving(true);
    try {
      await updateProfile({ projects: next as any }, { section: 'projects' });
      toast.success('Removed.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => (r.full_name || '').toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q));
  }, [repos, query]);

  const repoBusy = loading || saving;

  return (
    <SettingsTabRoot>
      <SettingsSectionHeader
        variant="openSource"
        onPrimaryAction={openImportDialog}
        disabled={loading || saving}
      />

      <SettingsTabPanel>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {imported.length === 0 ? (
          <div className="col-span-2">
            <SettingsSectionEmptyState
              icon={Github}
              title="No Repositories Linked"
              tagline="Sync your GitHub projects to display your coding activity."
            />
          </div>
        ) : (
          imported.map((p, i) => (
            <OpenSourceCard
              key={(p as any).repoFullName ?? i}
              item={p}
              index={i}
              saving={saving}
              onOpen={() => { if (p.publicationUrl) window.open(p.publicationUrl, '_blank', 'noopener,noreferrer'); }}
              onDetach={() => removeImported((p as any).repoFullName || '')}
            />
          ))
        )}
      </div>
      </SettingsTabPanel>

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        titleIcon={<Github aria-hidden />}
        title="Add open source"
        titleId="open-source-import"
        subtitle="Pick a repo to add to Projects."
        panelClassName="max-w-2xl"
        footer={
          !repoBusy ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Uses your linked GitHub token</p>
              <button
                type="button"
                onClick={() => void fetchRepos()}
                disabled={loading || saving}
                className={cn(settingsBtnBlockPrimarySm, 'px-5 py-2.5 text-xs tracking-wide')}
              >
                Refresh
              </button>
            </div>
          ) : undefined
        }
        interactionLock={repoBusy}
        interactionLockContent={
          repoBusy ? (
            <div className="flex flex-col items-center gap-4 border-2 border-border bg-muted/25 px-10 py-12 text-center dark:border-border dark:bg-black/55">
              <Loader2 className="size-10 shrink-0 animate-spin text-primary" aria-hidden />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {saving ? 'Saving…' : 'Loading repositories…'}
              </p>
            </div>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="border-2 border-destructive/60 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
              {error}
            </div>
          )}
          <FormInput
            id="os-search"
            label="Search repos"
            placeholder="Search by name (owner/repo)"
            maxLength={80}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="border-2 border-border bg-muted/10">
            <div className="flex items-center justify-between gap-3 border-b-2 border-border bg-muted/20 px-3 py-2">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Repositories</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">{filtered.length}</p>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-xs text-muted-foreground">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground">No repos found.</div>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((r) => {
                    const already = (user?.projects ?? []).some(
                      (p) => (p.publicationUrl || '').trim() === (r.html_url || '').trim(),
                    );
                    return (
                      <div key={r.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black uppercase">{r.name}</p>
                          <p className="truncate text-[10px] font-bold text-muted-foreground">{r.full_name}</p>
                          {r.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <a
                            href={r.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border-2 border-border bg-card px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-muted/30"
                          >
                            View
                          </a>
                          <button
                            type="button"
                            onClick={() => void addRepo(r.full_name)}
                            disabled={saving || already}
                            className={cn(settingsBtnBlockPrimarySm, 'px-3 py-2 text-[10px] tracking-widest')}
                          >
                            {already ? 'Added' : 'Add'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </FormDialog>

      <GithubNotConnectedDialog open={githubConnectPromptOpen} onClose={() => setGithubConnectPromptOpen(false)} />
    </SettingsTabRoot>
  );
}
