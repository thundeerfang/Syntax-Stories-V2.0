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

export function SecurityEmailContent() {
  const { user, token, refreshUser } = useAuthStore();
  const [newEmail, setNewEmail] = useState('');
  const [codeCurrent, setCodeCurrent] = useState('');
  const [codeNew, setCodeNew] = useState('');
  const [step, setStep] = useState<'enter' | 'verify'>('enter');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSendCode = async () => {
    if (sending) return;
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid new email address.');
      return;
    }
    if (email === (user?.email ?? '').trim().toLowerCase()) {
      toast.error('That is already your email.', { id: 'syntax-email-unchanged' });
      return;
    }
    if (!token) {
      toast.error('You must be logged in to change email.');
      return;
    }
    setSending(true);
    try {
      await authApi.initEmailChange(token, email);
      toast.success('Verification codes dispatched.');
      setStep('verify');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send code.');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (codeCurrent.length !== 6 || codeNew.length !== 6) {
      toast.error('Both 6-digit codes are required.');
      return;
    }
    if (!token) return;
    setVerifying(true);
    try {
      await authApi.verifyEmailChange(token, codeCurrent, codeNew);
      toast.success('Identity updated. Please re-link your accounts.');
      setStep('enter');
      setNewEmail('');
      setCodeCurrent('');
      setCodeNew('');
      await refreshUser();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancelEmailChange = async () => {
    if (token) {
      try {
        await authApi.cancelEmailChange(token);
        toast.info('Update email cancelled. Codes are invalid; request new codes to try again.');
      } catch {
        // Still clear local state so user can re-init
        toast.info('Update email cancelled. Request new codes to try again.');
      }
    }
    setStep('enter');
    setCodeCurrent('');
    setCodeNew('');
  };

  return (
    <SettingsTabRoot>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SettingsSectionHeading
          icon={<Mail />}
          title="Security Protocol: Email"
          description="Authorized personnel only. Changing your primary email requires dual-factor verification."
        />
        <div className="hidden shrink-0 md:flex gap-1">
          <div className={cn("px-2 py-1 text-[9px] font-black border-2 transition-colors", step === 'enter' ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>01. INITIATE</div>
          <div className={cn("px-2 py-1 text-[9px] font-black border-2 transition-colors", step === 'verify' ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>02. VERIFY</div>
        </div>
      </header>

      <SettingsTabPanel className="space-y-5">
        {step === 'enter' ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Current Primary Email</Label>
                <div className="p-3 border-2 border-border bg-muted/20 font-mono text-sm opacity-70 italic">
                  {user?.email}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">New Destination Email</Label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full p-3 border-2 border-primary bg-background focus:ring-4 focus:ring-primary/10 outline-none font-mono text-sm transition-all"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending || !newEmail.trim()}
              className={cn(
                settingsBtnBlockPrimaryMd,
                'px-6 py-3 text-xs tracking-widest disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {sending ? 'Processing...' : 'Request Verification Codes'}
              <ChevronDown className="-rotate-90 size-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Box 1 */}
              <div className="p-4 border-2 border-border bg-background space-y-4">
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Input Code: Current Email</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={codeCurrent}
                  onChange={(e) => setCodeCurrent(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full p-4 border-2 border-border bg-muted/10 text-center font-mono text-2xl tracking-[0.5em] focus:border-primary focus:bg-background outline-none transition-all"
                />
                <p className="text-[9px] text-muted-foreground text-center">Check: {user?.email}</p>
              </div>

              {/* Box 2 */}
              <div className="p-4 border-2 border-primary/50 bg-background space-y-4">
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Input Code: New Email</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={codeNew}
                  onChange={(e) => setCodeNew(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full p-4 border-2 border-primary text-center font-mono text-2xl tracking-[0.5em] focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                />
                <p className="text-[9px] text-muted-foreground text-center">Check: {newEmail}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className={cn(settingsBtnBlockPrimaryMd, 'flex-1 py-4 text-sm tracking-widest')}
              >
                {verifying ? 'Verifying Identity...' : 'Confirm Email Change'}
              </button>
              <GhostOutlineButton type="button" onClick={handleCancelEmailChange} size="lg">
                Cancel
              </GhostOutlineButton>
            </div>
          </div>
        )}
      </SettingsTabPanel>

      <div className="border-2 border-dashed border-border bg-muted/5 flex gap-4 items-start p-4">
        <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <strong>Security Note:</strong> Changing your email is a high-level action. Upon successful update, all current OAuth sessions (Google, GitHub, etc.) will be terminated for your protection. You must re-authenticate using the new credentials.
        </p>
      </div>
    </SettingsTabRoot>
  );
}

