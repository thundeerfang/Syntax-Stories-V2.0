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

export function SyntaxCardContent() {
  const { user } = useSettingsAuthSlice();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <SettingsTabRoot>
      <SettingsSectionHeading
        icon={<CreditCard />}
        title="Syntax DevCard"
        description="Your square developer identity card — export as PNG and share on X, Instagram, or Facebook."
      />

      <SettingsTabPanel className="max-w-md space-y-5">
        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
          Pulls your cover, avatar, posts, respects, followers, achievements, blog contribution map, and read streak into one retro card.
        </p>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className={cn(
            settingsBtnBlockPrimaryMd,
            'inline-flex items-center gap-2 border-2 border-border font-black text-[11px] uppercase tracking-widest shadow',
          )}
        >
          <CreditCard className="size-4" />
          Open Syntax Card
        </button>
      </SettingsTabPanel>

      <SyntaxCardDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        username={user?.username ?? ''}
        fullName={user?.fullName ?? user?.username ?? 'Developer'}
        profileImg={user?.profileImg}
        coverBanner={user?.coverBanner}
      />
    </SettingsTabRoot>
  );
}

