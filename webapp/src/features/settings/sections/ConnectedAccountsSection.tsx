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

export function ConnectedAccountsContent() {
  const { user, logout, token } = useAuthStore();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Unlinking ${provider} will log you out. Continue?`)) return;
    if (!token) return;
    setDisconnecting(provider);
    try {
      await authApi.disconnectProvider(token, provider);
      toast.success('Connection severed. Logging out...');
      setTimeout(() => logout(), 1500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to disconnect.');
      setDisconnecting(null);
    }
  };

  const handleConnect = async (id: string) => {
    if (!token) return;
    setLinkingProvider(id);
    try {
      const data = await authApi.getLinkRedirectUrl(token, id as 'google' | 'github' | 'facebook' | 'x' | 'discord');
      if (data.redirectUrl) {
        markOAuthNavigationPending();
        window.location.href = data.redirectUrl;
        return;
      }
      toast.error(data.message ?? 'Could not start linking');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start linking');
    } finally {
      setLinkingProvider(null);
    }
  };

  const providers = [
    { id: 'google', label: 'Google Cloud', linked: user?.isGoogleAccount, color: '#4285F4' },
    { id: 'github', label: 'GitHub Source', linked: user?.isGitAccount, color: '#24292F' },
    { id: 'x', label: 'X (Twitter)', linked: user?.isXAccount, color: '#000000' },
    { id: 'facebook', label: 'Meta / FB', linked: user?.isFacebookAccount, color: '#1877F2' },
    { id: 'discord', label: 'Discord', linked: user?.isDiscordAccount, color: '#5865F2' },
  ] as const;

  return (
    <SettingsTabRoot>
      <SettingsSectionHeading
        icon={<Plug />}
        title="Connected Nodes"
        description="Manage your external authentication modules."
      />

      <SettingsTabPanel>
      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((p) => {
          const Icon = PROVIDER_ICONS[p.id] ?? Plug;
          return (
            <div
              key={p.id}
              className={cn(
                "group relative border-4 p-5 transition-all",
                p.linked ? "border-primary bg-primary/5 shadow" : "border-border bg-background"
              )}
            >
              {/* Status Light */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-[8px] font-black uppercase tracking-tighter",
                    p.linked ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {p.linked
                    ? "LINKED"
                    : linkingProvider === p.id
                      ? "LINKING..."
                      : "OFFLINE"}
                </span>
                <div
                  className={cn(
                    "size-2 border border-black",
                    p.linked
                      ? "bg-primary animate-pulse"
                      : linkingProvider === p.id
                        ? "bg-yellow-400 animate-pulse"
                        : "bg-muted"
                  )}
                />
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div
                  className={cn(
                    'flex shrink-0 items-center justify-center border-2 border-black shadow',
                    p.id === 'github' && !p.linked ? 'size-16 overflow-hidden' : 'size-12',
                    p.linked ? 'bg-primary text-primary-foreground' : 'bg-muted/20 text-muted-foreground',
                  )}
                >
                  {p.id === 'github' && !p.linked ? (
                    <GithubConnectLottie size={56} />
                  ) : p.id === 'google' ? (
                    <span className="flex items-center justify-center bg-white p-1.5">
                      <Icon className="size-6" />
                    </span>
                  ) : (
                    <Icon className="size-6" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase leading-none">{p.label}</h4>
                  <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">
                    {p.linked ? `Active Session` : 'No connection'}
                  </p>
                </div>
              </div>

              {p.linked ? (
                <button
                  type="button"
                  onClick={() => handleDisconnect(p.id)}
                  disabled={!!disconnecting}
                  className="w-full py-2 border-2 border-destructive text-destructive font-black text-[10px] uppercase tracking-widest hover:bg-destructive hover:text-white transition-all disabled:opacity-50"
                >
                  {disconnecting === p.id ? 'SEVERING...' : 'Sever Connection'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnect(p.id)}
                  disabled={!!linkingProvider}
                  className="w-full py-2 border-2 border-black bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-all disabled:opacity-50 shadow active:shadow-none"
                >
                  {linkingProvider === p.id ? 'REDIRECTING...' : 'Establish Link'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      </SettingsTabPanel>
    </SettingsTabRoot>
  );
}

