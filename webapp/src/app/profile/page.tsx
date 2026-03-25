'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { followApi } from '@/api/follow';
import { analyticsApi, type ProfileOverviewMetrics, type ProfileTimePoint } from '@/api/analytics';
import {
  Edit3,
  Plus,
  FileText,
  Monitor,
  Users,
  Award,
  Terminal,
  Github,
  Linkedin,
  Instagram,
  Youtube,
  Eye,

  TrendingUp,
  Copy,
  Check,
  ChevronRight,
  Activity,
  PenSquare,
  BarChart2,
  Wrench,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Switch, AreaChart } from '@/components/retroui';
import { useSidebar } from '@/hooks/useSidebar';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuthStore } from '@/store/auth';
import { authApi, type ParseCvMissingFieldKey, type IncompleteItemHints } from '@/api/auth';
import type { CompleteItemDialogSection } from '@/components/profile/dialog';
import { WalletLottie, SparkLottie, StreakFireLottie } from '@/components/ui';
import { ProfileHeatmap } from '@/components/profile/ProfileHeatmap';
import { FollowersFollowingDialog, MissingFieldsDialog } from '@/components/profile/dialog';
import { getSkillIconUrl } from '@/lib/skillIcons';
import { TerminalLoaderPage } from '@/components/loader';
import { WorkExperienceCard } from '@/app/settings/settings-list/WorkExperienceCard';
import { EducationCard } from '@/app/settings/settings-list/EducationCard';
import { CertificationCard } from '@/app/settings/settings-list/CertificationCard';
import { ProjectCard } from '@/app/settings/settings-list/ProjectCard';
import { OpenSourceCard } from '@/app/settings/settings-list/OpenSourceCard';
import { ProfileSectionAccordion, type ProfileSectionVariant } from '@/components/ui/ProfileSectionAccordion';
import { HoverCard } from '@/components/ui/HoverCard';
import { LinkPreviewCardContent } from '@/components/ui/LinkPreviewCardContent';
import {
  domainFromUrl,
  formatJoinedDate,
  formatMonthYear,
  isImageUrl,
  locationWithoutType,
  normalizeDomain,
} from '@/lib/profileDisplay';

type ActivityTab = 'posts' | 'replies' | 'repost';

export default function ProfilePage() {
  const router = useRouter();
  const { isOpen } = useSidebar();
  const { user, token, isHydrated, shouldBlock } = useRequireAuth();
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [activityTab, setActivityTab] = useState<ActivityTab>('posts');
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [profileUrlCopied, setProfileUrlCopied] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [missingFieldsDialogOpen, setMissingFieldsDialogOpen] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState<ParseCvMissingFieldKey[]>([]);
  const [incompleteItemHints, setIncompleteItemHints] = useState<IncompleteItemHints | null>(null);
  /** Pending CV-extracted data: only saved when user clicks Save in the dialog; discarded on Skip. */
  const [pendingCvExtracted, setPendingCvExtracted] = useState<Parameters<typeof updateProfile>[0] | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [followCounts, setFollowCounts] = useState({ followersCount: 0, followingCount: 0 });
  const [overviewMetrics, setOverviewMetrics] = useState<ProfileOverviewMetrics | null>(null);
  const [timeSeries, setTimeSeries] = useState<ProfileTimePoint[]>([]);
  /** Only one section accordion open at a time; default Work Experience */
  const [openSectionId, setOpenSectionId] = useState<ProfileSectionVariant | null>('workExperience');
  const accordionsRootRef = useRef<HTMLDivElement>(null);

  const [visibleCounts, setVisibleCounts] = useState<Record<ProfileSectionVariant, number>>({
    workExperience: 1,
    education: 1,
    certification: 1,
    project: 1,
    openSource: 2,
    mySetup: 2,
  });
  const [sectionLoading, setSectionLoading] = useState<Record<ProfileSectionVariant, boolean>>({
    workExperience: false,
    education: false,
    certification: false,
    project: false,
    openSource: false,
    mySetup: false,
  });

  const setSectionOpen = (variant: ProfileSectionVariant, open: boolean) => {
    if (!open) {
      setOpenSectionId((prev) => (prev === variant ? null : prev));
      return;
    }
    setOpenSectionId(variant);
    setVisibleCounts((prev) => ({
      ...prev,
      [variant]:
        variant === 'openSource'
          ? Math.max(prev[variant] ?? 2, 2)
          : variant === 'mySetup'
            ? Math.max(prev[variant] ?? 2, 2)
            : Math.max(prev[variant] ?? 1, 1),
    }));
    setSectionLoading((prev) => ({ ...prev, [variant]: true }));
    window.setTimeout(() => {
      setSectionLoading((prev) => ({ ...prev, [variant]: false }));
    }, 420);
  };

  const viewMore = (variant: ProfileSectionVariant, step = 1) => {
    setSectionLoading((prev) => ({ ...prev, [variant]: true }));
    window.setTimeout(() => {
      setVisibleCounts((prev) => ({ ...prev, [variant]: (prev[variant] ?? 0) + step }));
      setSectionLoading((prev) => ({ ...prev, [variant]: false }));
    }, 420);
  };

  const CardSkeleton = ({ lines = 3 }: { lines?: number }) => (
    <div className="border-2 border-border bg-muted/10 p-4 animate-pulse">
      <div className="h-4 w-40 bg-muted rounded" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 w-full bg-muted rounded" />
        ))}
        <div className="h-3 w-2/3 bg-muted rounded" />
      </div>
    </div>
  );

  useEffect(() => {
    const onDown = (ev: MouseEvent) => {
      if (!openSectionId) return;
      const root = accordionsRootRef.current;
      if (root && !root.contains(ev.target as Node)) {
        setOpenSectionId(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openSectionId]);

  useEffect(() => {
    if (!user?.username) return;
    followApi.getFollowCounts(user.username).then((res) => {
      if (res.success) setFollowCounts({ followersCount: res.followersCount, followingCount: res.followingCount });
    }).catch(() => {});
  }, [user?.username]);

  useEffect(() => {
    if (!user?.username) return;
    analyticsApi
      .getProfileOverview(user.username)
      .then((m) => {
        if (m) setOverviewMetrics(m);
      })
      .catch(() => {});
  }, [user?.username]);

  useEffect(() => {
    if (!user?.username) return;
    analyticsApi
      .getProfileTimeSeries(user.username)
      .then((series) => setTimeSeries(series))
      .catch(() => {});
  }, [user?.username]);

  const publicProfileUrl = useMemo(() => {
    if (typeof window === 'undefined' || !user?.username) return '';
    return `${window.location.origin}/u/${user.username}`;
  }, [user?.username]);

  // Profile Activity charts: only show when we have enough daily data (avoid misleading straight lines)
  const weekChartData = useMemo(
    () => timeSeries.slice(-7).map((p) => ({ name: p.date.slice(5), views: p.views })),
    [timeSeries]
  );
  const monthChartData = useMemo(
    () => timeSeries.map((p) => ({ name: p.date.slice(5), views: p.views })),
    [timeSeries]
  );
  const showWeekChart = weekChartData.length >= 2;
  const showMonthChart = monthChartData.length >= 7;
  const showTotalChart = monthChartData.length >= 7;

  const copyProfileUrl = async () => {
    const url = publicProfileUrl || (typeof window !== 'undefined' ? window.location.origin + '/profile' : '');
    try {
      await navigator.clipboard.writeText(url);
      setProfileUrlCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setProfileUrlCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const joinedLabel = useMemo(() => {
    const str = formatJoinedDate(user?.createdAt);
    return str ? `Joined ${str}` : '';
  }, [user?.createdAt]);

  const markdownToHtml = (raw: string) => {
    const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    let s = escape(raw || '');
    // Keep patterns conservative to avoid leaking stray '*' in edge cases like "*Harshit *is"
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_\n]+)__/g, '<u>$1</u>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    return s.replace(/\n/g, '<br>');
  };

  // Match settings: Projects = manual only; Open Source = GitHub repos from projects + openSourceContributions (must run before any early return)
  const profileProjects = useMemo(() => {
    const full = user?.projects ?? [];
    const isGithub = (p: unknown) => (p as { source?: string }).source === 'github';
    return {
      nonGithub: full.filter((p) => !isGithub(p)),
      github: full.filter(isGithub),
    };
  }, [user?.projects]);

  const openSourceList = useMemo(() => {
    const fromProjects = profileProjects.github;
    const fromContributions = (user?.openSourceContributions ?? []).map((c) => ({
      ...c,
      repoFullName: (c as { repoFullName?: string }).repoFullName ?? c.repository ?? c.repo ?? c.title,
      publicationUrl: (c as { publicationUrl?: string }).publicationUrl ?? (c as { repositoryUrl?: string }).repositoryUrl ?? (c as { url?: string }).url,
    }));
    return [...fromProjects, ...fromContributions].slice(0, 7);
  }, [profileProjects.github, user?.openSourceContributions]);

  if (!isHydrated || shouldBlock) {
    return <TerminalLoaderPage pageName="profile" />;
  }

  const settingsUrl = (section: string) => `/settings?section=${encodeURIComponent(section)}`;

  // Reusable Section Header (hide Add button in preview mode; Add links to settings tab when settingsSection provided)
  const SectionHeader = ({
    icon: Icon,
    title,
    showAdd = true,
    settingsSection,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    showAdd?: boolean;
    settingsSection?: string;
  }) => (
    <div className="flex items-center justify-between px-2 mb-4">
      <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      {showAdd && !isPreviewMode && (
        settingsSection ? (
          <Link
            href={settingsUrl(settingsSection)}
            className="text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-0.5 bg-card shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 transition-all"
          >
            <Plus className="size-3" /> Add
          </Link>
        ) : (
          <button className="text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-0.5 bg-card shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 transition-all">
            <Plus className="size-3" /> Add
          </button>
        )
      )}
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans text-foreground ss-profile-readonly">
      <div className={cn('mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8', isOpen ? 'max-w-6xl' : 'max-w-7xl')}>
        
        {/* ================= LEFT COLUMN ================= */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* HEADER SECTION */}
          <section className="border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)] overflow-hidden">
            {/* Cover: user cover or gradient */}
            <div className="h-48 relative border-b-4 border-border overflow-hidden">
              {user?.coverBanner ? (
                <img src={user.coverBanner} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full gradient-auto" />
              )}
            </div>

            <div className="px-6 pb-8 pt-24 md:pt-32 relative bg-card">
              <div className="absolute -top-14 left-6 size-28 md:size-36 border-4 border-border bg-muted shadow-[6px_6px_0px_0px_var(--primary)] overflow-hidden">
                <img
                  src={user?.profileImg || user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter italic">{user?.fullName || user?.name || 'Profile'}</h1>
                    <div className="text-primary font-bold flex items-center gap-2 mt-1 uppercase text-xs tracking-widest">
                      <span>{user?.username ? `@${user.username}` : ''}</span>
                      {user?.portfolioUrl?.trim() ? (
                        <HoverCard
                          content={<LinkPreviewCardContent domain={user.portfolioUrl} title="Portfolio" />}
                          side="top"
                          align="start"
                          contentClassName="w-[280px] p-0"
                        >
                          <a
                            href={user.portfolioUrl.trim().startsWith('http') ? user.portfolioUrl.trim() : `https://${user.portfolioUrl.trim()}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open portfolio"
                            className="inline-flex items-center justify-center size-7 border-2 border-border bg-card text-foreground hover:bg-muted shadow-[2px_2px_0px_0px_var(--border)]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe className="size-4 text-primary" />
                          </a>
                        </HoverCard>
                      ) : null}
                      {joinedLabel && (
                        <>
                          <span className="size-1.5 bg-border rounded-full" /> {joinedLabel}
                        </>
                      )}
                    </div>
                  </div>
                  {!isPreviewMode && (
                    <div className="flex gap-3 md:pt-1">
                      <Link href="/settings" className="flex items-center gap-2 px-4 py-2 border-2 border-border bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--border)] active:shadow-none transition-all">
                        <Edit3 className="size-3.5" /> Edit Profile
                      </Link>
                    </div>
                  )}
                </div>

                {user?.bio?.trim() ? (
                  <div className="relative border-2 border-border bg-muted/5 p-6 pt-10 group">
                    <div className="absolute top-0 left-0 flex items-stretch">
                      <div className="bg-primary px-3 py-1.5 flex items-center gap-2">
                        <Terminal className="size-3 text-primary-foreground" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary-foreground">
                          Summary_Report
                        </span>
                      </div>
                      <div className="w-4 bg-primary" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 100%)' }} />
                    </div>

                    <div className="absolute top-2 right-4 text-[8px] font-mono text-muted-foreground/40 uppercase tracking-widest hidden sm:block">
                      REF_NO: {String((user as any)?.id ?? (user as any)?._id ?? '').slice(-8) || '0000X-SYS'}
                    </div>

                    <div
                      className="text-sm text-foreground/80 font-medium leading-relaxed max-w-none
                        [&_strong]:text-primary [&_strong]:font-black [&_u]:decoration-primary/50 [&_em]:italic [&_em]:text-foreground"
                      dangerouslySetInnerHTML={{ __html: markdownToHtml(user.bio) }}
                    />

                    <div className="absolute bottom-1 right-1 size-3 border-r-2 border-b-2 border-border/50" />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border p-10 flex flex-col items-center justify-center text-center bg-muted/5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">
                      &gt; Biography_Data_Missing
                    </p>
                    {!isPreviewMode && (
                      <Link
                        href="/settings"
                        className="px-4 py-2 border-2 border-primary text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        Initialize Summary
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Stats Bar */}
              <div className="flex flex-wrap gap-6 mt-8 p-4 border-4 border-gray-300 dark:border-border border-dashed bg-muted/5">
                <div className="flex items-center gap-2">
                  <SparkLottie play size={24} />
                  <span className="font-black text-sm uppercase">10</span>
                  <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">Respect</span>
                </div>
                <div className="flex items-center gap-2">
                  <WalletLottie play size={24} />
                  <span className="font-black text-sm uppercase">0</span>
                  <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">Wallet</span>
                </div>
                <div className="flex items-center gap-2">
                  <StreakFireLottie play size={24} />
                  <span className="font-black text-sm uppercase">0</span>
                  <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">Streak</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <span className="font-black text-sm uppercase">{followCounts.followersCount}</span>
                  <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">Followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <span className="font-black text-sm uppercase">{followCounts.followingCount}</span>
                  <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">Following</span>
                </div>
              </div>
            </div>
          </section>

          {/* ACTIVITY TABS */}
          <section className="space-y-4 border-4 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                <Activity className="size-4 text-primary" /> Activity
              </h2>
              {!isPreviewMode && (
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 border-2 border-border bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-[3px_3px_0px_0px_var(--border)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  <PenSquare className="size-3.5" /> Add post
                </button>
              )}
            </div>
            <div className="flex gap-1 border-b-4 border-border pb-3">
              {(['posts', 'replies', 'repost'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActivityTab(tab)}
                  className={cn(
                    'flex-1 px-3 py-2 font-black text-[10px] uppercase tracking-widest border-2 border-border transition-all',
                    activityTab === tab
                      ? 'bg-primary text-primary-foreground border-primary shadow-[3px_3px_0px_0px_var(--border)]'
                      : 'bg-card hover:bg-muted text-muted-foreground'
                  )}
                >
                  {tab === 'posts' ? 'Posts' : tab === 'replies' ? 'Replies' : 'Repost'}
                </button>
              ))}
            </div>
            <div className="border-4 border-border border-dashed p-10 bg-muted/5 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                No posts found. Your activity will appear here.
              </p>
            </div>
          </section>

          {/* AUTOFILL - hidden in preview (owner-only) */}
          {!isPreviewMode && (
          <div className="border-4 border-border bg-primary p-6 flex flex-col md:flex-row items-center gap-6 shadow-[8px_8px_0px_0px_var(--border)]">
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file || !token) return;
                setPdfUploading(true);
                try {
                  const { extracted, missingFields, incompleteItemHints: hints } = await authApi.parseCv(token, file);
                  setIncompleteItemHints(hints ?? null);
                  setMissingFieldsList(missingFields);
                  if (Object.keys(extracted).length > 0) {
                    setPendingCvExtracted(extracted);
                    setMissingFieldsDialogOpen(true);
                  } else {
                    toast.info('No profile data could be extracted from this PDF.');
                  }
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to parse PDF');
                } finally {
                  setPdfUploading(false);
                }
              }}
            />
            <div className="size-16 bg-white border-4 border-border flex items-center justify-center shrink-0 -rotate-3">
              <FileText className="size-8 text-primary" />
            </div>
            <div className="flex-1 space-y-1 text-center md:text-left">
              <h3 className="text-lg font-black uppercase tracking-tight text-primary-foreground">Autofill your profile!</h3>
              <p className="text-xs font-bold text-primary-foreground/80 uppercase">Import details directly from your CV in seconds.</p>
            </div>
            <button
              type="button"
              disabled={pdfUploading}
              onClick={() => pdfInputRef.current?.click()}
              className="px-6 py-3 bg-white text-black border-4 border-border font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--border)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-60 disabled:pointer-events-none"
            >
              {pdfUploading ? 'Parsing…' : 'Upload PDF'}
            </button>
          </div>
          )}

          <MissingFieldsDialog
            open={missingFieldsDialogOpen}
            onClose={() => {
              setMissingFieldsDialogOpen(false);
              setMissingFieldsList([]);
              setIncompleteItemHints(null);
              setPendingCvExtracted(null);
            }}
            missingFields={missingFieldsList}
            incompleteItemHints={incompleteItemHints}
            currentProfile={
              pendingCvExtracted
                ? {
                    workExperiences: pendingCvExtracted.workExperiences ?? user?.workExperiences,
                    education: pendingCvExtracted.education ?? user?.education,
                    certifications: pendingCvExtracted.certifications ?? user?.certifications,
                    projects: pendingCvExtracted.projects ?? user?.projects,
                  }
                : user
                  ? { workExperiences: user.workExperiences, education: user.education, certifications: user.certifications, projects: user.projects }
                  : null
            }
            settingsHref="/settings"
            onSave={async (values) => {
              const scalar: Parameters<typeof updateProfile>[0] = {};
              if (typeof values.bio === 'string' && values.bio.trim()) scalar.bio = values.bio.trim();
              if (typeof values.linkedin === 'string' && values.linkedin.trim()) scalar.linkedin = values.linkedin.trim();
              if (typeof values.github === 'string' && values.github.trim()) scalar.github = values.github.trim();
              if (Array.isArray(values.stackAndTools) && values.stackAndTools.length > 0) scalar.stackAndTools = values.stackAndTools;
              const payload = pendingCvExtracted ? { ...pendingCvExtracted, ...scalar } : scalar;
              if (Object.keys(payload).length > 0) await updateProfile(payload);
              setPendingCvExtracted(null);
              setMissingFieldsDialogOpen(false);
              setMissingFieldsList([]);
              setIncompleteItemHints(null);
              toast.success('Profile updated from your CV. Add the rest in Settings when ready.');
            }}
            onCompleteItem={async (section: CompleteItemDialogSection, index: number, newValues: Record<string, string>) => {
              const removeHint = () => {
                setIncompleteItemHints((prev) => {
                  if (!prev) return null;
                  const list = prev[section];
                  if (!list?.length) return prev;
                  const next = list.filter((_, i) => i !== index);
                  if (next.length === 0) { const o = { ...prev }; delete o[section]; return Object.keys(o).length ? o : null; }
                  return { ...prev, [section]: next };
                });
              };
              if (pendingCvExtracted && Array.isArray(pendingCvExtracted[section]) && (pendingCvExtracted[section] as unknown[])[index]) {
                const arr = [...(pendingCvExtracted[section] as Array<Record<string, unknown>>)];
                arr[index] = { ...arr[index], ...newValues };
                setPendingCvExtracted({ ...pendingCvExtracted, [section]: arr });
                removeHint();
                toast.success('Fields added. Complete all items to enable Save.');
                return;
              }
              if (!user) return;
              const arr = (user[section] ?? []) as Array<Record<string, unknown>>;
              const updated = [...arr];
              if (!updated[index]) return;
              updated[index] = { ...updated[index], ...newValues };
              await updateProfile({ [section]: updated } as Parameters<typeof updateProfile>[0]);
              removeHint();
              toast.success('Fields saved.');
            }}
            onEditInSettings={pendingCvExtracted ? async (section, index) => {
              const hasIncomplete = incompleteItemHints && (
                (incompleteItemHints.education?.length ?? 0) +
                (incompleteItemHints.certifications?.length ?? 0) + (incompleteItemHints.workExperiences?.length ?? 0)
              ) > 0;
              if (hasIncomplete) {
                toast.error('Complete all required fields first (use Add fields above) before opening Settings.');
                return;
              }
              await updateProfile(pendingCvExtracted);
              setPendingCvExtracted(null);
              setMissingFieldsDialogOpen(false);
              setMissingFieldsList([]);
              setIncompleteItemHints(null);
              const sectionId = section === 'workExperiences' ? 'work-experiences' : section === 'education' ? 'education' : section === 'certifications' ? 'certifications' : 'projects';
              router.push(`/settings?section=${sectionId}&edit=${index}`);
            } : undefined}
          />

          {/* DYNAMIC SECTIONS — data from backend */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
              <SectionHeader icon={Monitor} title="Stack & Tools" settingsSection="stack-tools" />
              {user?.stackAndTools?.length ? (
                <div className="relative">
                  <div className="flex gap-3 overflow-x-auto ss-scrollbar-hide py-1 pr-1 snap-x">
                    {user.stackAndTools.map((t, i) => {
                      const iconUrl = getSkillIconUrl(t);
                      return (
                        <div
                          key={i}
                          className="snap-start shrink-0 border-2 border-border bg-muted/10 px-3 py-2 shadow-[2px_2px_0px_0px_var(--border)]"
                          title={t}
                        >
                          <div className="flex items-center gap-2">
                            <div className="size-7 flex items-center justify-center overflow-hidden">
                              {iconUrl ? (
                                <img
                                  src={iconUrl}
                                  alt={t}
                                  className="size-full object-contain"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <Monitor className="size-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                              {t}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Add your tech stack</p>
                  {!isPreviewMode && (
                    <Link href={settingsUrl('stack-tools')} className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                      <Plus className="size-3" /> Add
                    </Link>
                  )}
                </div>
              )}
            </section>

            <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
              <SectionHeader icon={Wrench} title="My Setup" settingsSection="my-setup" />
              {(user as any)?.mySetup?.length ? (
                <div className="relative">
                  <div className="flex gap-3 overflow-x-auto ss-scrollbar-hide py-1 pr-1 snap-x">
                    {((user as any).mySetup as Array<{ label: string; imageUrl: string; productUrl?: string }>).slice(0, 5).map((it, i) => {
                      const hasProduct = Boolean((it.productUrl ?? '').trim());
                      return (
                        <div
                          key={`${it.imageUrl}-${i}`}
                          className="snap-start shrink-0 w-[240px] border-2 border-border bg-muted/10 shadow-[2px_2px_0px_0px_var(--border)] overflow-hidden"
                        >
                          <div className="h-28 border-b-2 border-border bg-muted/20 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={it.imageUrl} alt={it.label} className="h-full w-full object-cover" loading="lazy" />
                          </div>
                          <div className="p-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">
                              {it.label}
                            </div>
                            {hasProduct ? (
                              <a
                                href={it.productUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-[10px] font-black uppercase text-primary hover:underline"
                              >
                                <ExternalLink className="size-3.5" /> Product
                              </a>
                            ) : (
                              <div className="mt-2 text-[10px] font-bold uppercase text-muted-foreground">No link</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Add your setup</p>
                  {!isPreviewMode && (
                    <Link href={settingsUrl('my-setup')} className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                      <Plus className="size-3" /> Add
                    </Link>
                  )}
                </div>
              )}
            </section>
          </div>

          <div ref={accordionsRootRef} className="space-y-6">
            <ProfileSectionAccordion
              variant="workExperience"
              open={openSectionId === 'workExperience'}
              onOpenChange={(open) => setSectionOpen('workExperience', open)}
              subtitle={user?.workExperiences?.length ? `${user.workExperiences.length} ${user.workExperiences.length === 1 ? 'entry' : 'entries'}` : undefined}
              headerAction={!isPreviewMode && (
                <Link href={settingsUrl('work-experiences')} className="text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-1 bg-card shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 transition-all" onClick={(e) => e.stopPropagation()}>
                  <Plus className="size-3" /> Add
                </Link>
              )}
            >
              {user?.workExperiences?.length ? (
                <div className="space-y-4">
                  {sectionLoading.workExperience
                    ? <CardSkeleton lines={4} />
                    : user.workExperiences.slice(0, visibleCounts.workExperience).map((e, i) => (
                    <WorkExperienceCard
                      key={i}
                      experience={e}
                      index={i}
                      saving={false}
                      onEdit={() => router.push(settingsUrl('work-experiences'))}
                      onRemove={() => {}}
                      onPreviewMedia={() => {}}
                      formatMonthYear={formatMonthYear}
                      locationWithoutType={locationWithoutType}
                      normalizeDomain={normalizeDomain}
                      isImageUrl={isImageUrl}
                      hideActions
                    />
                  ))}

                  {user.workExperiences.length > visibleCounts.workExperience ? (
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={sectionLoading.workExperience}
                        onClick={() => viewMore('workExperience', 1)}
                        className="w-full px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
                      >
                        {sectionLoading.workExperience ? 'LOADING…' : `View more (${visibleCounts.workExperience}/${user.workExperiences.length})`}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add work experience</p>
                  {!isPreviewMode && (
                    <Link href={settingsUrl('work-experiences')} className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                      <Plus className="size-3" /> Add
                    </Link>
                  )}
                </div>
              )}
            </ProfileSectionAccordion>

            <ProfileSectionAccordion
              variant="education"
              open={openSectionId === 'education'}
              onOpenChange={(open) => setSectionOpen('education', open)}
              subtitle={user?.education?.length ? `${user.education.length} ${user.education.length === 1 ? 'entry' : 'entries'}` : undefined}
              headerAction={!isPreviewMode && (
                <Link href={settingsUrl('education')} className="text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-1 bg-card shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 transition-all" onClick={(e) => e.stopPropagation()}>
                  <Plus className="size-3" /> Add
                </Link>
              )}
            >
              {user?.education?.length ? (
                <div className="space-y-4">
                  {sectionLoading.education
                    ? <CardSkeleton lines={3} />
                    : user.education.slice(0, visibleCounts.education).map((e, i) => (
                    <EducationCard
                      key={i}
                      education={e}
                      index={i}
                      saving={false}
                      onEdit={() => router.push(settingsUrl('education'))}
                      onRemove={() => {}}
                      formatMonthYear={formatMonthYear}
                      hideActions
                    />
                  ))}

                  {user.education.length > visibleCounts.education ? (
                    <div className="pt-2">
                      <button
                        type="button"
                        disabled={sectionLoading.education}
                        onClick={() => viewMore('education', 1)}
                        className="w-full px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
                      >
                        {sectionLoading.education ? 'LOADING…' : `View more (${visibleCounts.education}/${user.education.length})`}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add education</p>
                  {!isPreviewMode && (
                    <Link href={settingsUrl('education')} className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                      <Plus className="size-3" /> Add
                    </Link>
                  )}
                </div>
              )}
            </ProfileSectionAccordion>

          <ProfileSectionAccordion
            variant="certification"
            open={openSectionId === 'certification'}
            onOpenChange={(open) => setSectionOpen('certification', open)}
            subtitle={user?.certifications?.length ? `${user.certifications.length} ${user.certifications.length === 1 ? 'entry' : 'entries'}` : undefined}
            headerAction={!isPreviewMode && (
              <Link href={settingsUrl('certifications')} className="text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-1 bg-card shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 transition-all" onClick={(e) => e.stopPropagation()}>
                <Plus className="size-3" /> Add
              </Link>
            )}
          >
            {user?.certifications?.length ? (
              <div className="space-y-4">
                {sectionLoading.certification
                  ? <CardSkeleton lines={4} />
                  : user.certifications.slice(0, visibleCounts.certification).map((c, i) => (
                  <CertificationCard
                    key={i}
                    cert={c}
                    index={i}
                    saving={false}
                    onEdit={() => router.push(settingsUrl('certifications'))}
                    onRemove={() => {}}
                    onPreviewMedia={() => {}}
                    formatMonthYear={formatMonthYear}
                    domainFromUrl={domainFromUrl}
                    isImageUrl={isImageUrl}
                    hideActions
                  />
                ))}

                {user.certifications.length > visibleCounts.certification ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={sectionLoading.certification}
                      onClick={() => viewMore('certification', 1)}
                      className="w-full px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
                    >
                      {sectionLoading.certification ? 'LOADING…' : `View more (${visibleCounts.certification}/${user.certifications.length})`}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add certifications</p>
                {!isPreviewMode && (
                  <Link href={settingsUrl('certifications')} className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                    <Plus className="size-3" /> Add
                  </Link>
                )}
              </div>
            )}
          </ProfileSectionAccordion>

          <ProfileSectionAccordion
            variant="project"
            open={openSectionId === 'project'}
            onOpenChange={(open) => setSectionOpen('project', open)}
            subtitle={profileProjects.nonGithub.length > 0 ? `${profileProjects.nonGithub.length} ${profileProjects.nonGithub.length === 1 ? 'entry' : 'entries'}` : undefined}
            headerAction={!isPreviewMode && (
              <Link href={settingsUrl('projects')} className="text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-1 bg-card shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 transition-all" onClick={(e) => e.stopPropagation()}>
                <Plus className="size-3" /> Add
              </Link>
            )}
          >
            {profileProjects.nonGithub.length > 0 ? (
              <div className="space-y-4">
                {sectionLoading.project
                  ? <CardSkeleton lines={4} />
                  : profileProjects.nonGithub.slice(0, visibleCounts.project).map((p, i) => (
                  <ProjectCard
                    key={i}
                    project={p}
                    index={i}
                    saving={false}
                    onEdit={() => router.push(settingsUrl('projects'))}
                    onRemove={() => {}}
                    onPreviewMedia={() => {}}
                    formatMonthYear={formatMonthYear}
                    domainFromUrl={domainFromUrl}
                    isImageUrl={isImageUrl}
                    hideActions
                  />
                ))}

                {profileProjects.nonGithub.length > visibleCounts.project ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={sectionLoading.project}
                      onClick={() => viewMore('project', 1)}
                      className="w-full px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
                    >
                      {sectionLoading.project ? 'LOADING…' : `View more (${visibleCounts.project}/${profileProjects.nonGithub.length})`}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add your projects</p>
                {!isPreviewMode && (
                  <Link href={settingsUrl('projects')} className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                    <Plus className="size-3" /> Add
                  </Link>
                )}
              </div>
            )}
          </ProfileSectionAccordion>

            <ProfileSectionAccordion
              variant="openSource"
              open={openSectionId === 'openSource'}
              onOpenChange={(open) => setSectionOpen('openSource', open)}
              subtitle={openSourceList.length > 0 ? `${openSourceList.length} ${openSourceList.length === 1 ? 'repo' : 'repos'}` : undefined}
              headerAction={!isPreviewMode && (
                <Link href={settingsUrl('open-source')} className="text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-1 bg-card shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 transition-all" onClick={(e) => e.stopPropagation()}>
                  <Plus className="size-3" /> Add
                </Link>
              )}
            >
              {openSourceList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectionLoading.openSource ? (
                    <>
                      <CardSkeleton lines={3} />
                      <CardSkeleton lines={3} />
                    </>
                  ) : (
                    openSourceList.slice(0, visibleCounts.openSource).map((item, i) => (
                    <OpenSourceCard
                      key={(item as { repoFullName?: string }).repoFullName ?? i}
                      item={item}
                      index={i}
                      saving={false}
                      onOpen={() => {
                        const url = (item as { publicationUrl?: string }).publicationUrl ?? (item as { url?: string }).url ?? (item as { repositoryUrl?: string }).repositoryUrl;
                        if (url) window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      onDetach={() => {}}
                      hideActions
                    />
                    ))
                  )}

                  {openSourceList.length > visibleCounts.openSource ? (
                    <div className="md:col-span-2 pt-1">
                      <button
                        type="button"
                        disabled={sectionLoading.openSource}
                        onClick={() => viewMore('openSource', 2)}
                        className="w-full px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
                      >
                        {sectionLoading.openSource ? 'LOADING…' : `View more (${Math.min(visibleCounts.openSource, openSourceList.length)}/${openSourceList.length})`}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add contributions</p>
                  {!isPreviewMode && (
                    <Link href={settingsUrl('open-source')} className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                      <Plus className="size-3" /> Add contribution
                    </Link>
                  )}
                </div>
              )}
            </ProfileSectionAccordion>
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. PREVIEW MODE */}
          <div className="border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 border-2 border-border bg-muted flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border)]">
                <Eye className="size-4" />
              </div>
              <div>
                <h3 className="text-[10px] font-black uppercase">Preview Mode</h3>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Public View</p>
              </div>
            </div>
            <Switch checked={isPreviewMode} onCheckedChange={setIsPreviewMode} />
          </div>

          {/* 2. FOLLOWERS / FOLLOWING CARD */}
          <div className="border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 border-2 border-border bg-muted/50 flex items-center justify-center">
                  <Users className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase">Followers & Following</p>
                  {followCounts.followersCount === 0 && followCounts.followingCount === 0 ? (
                    <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">
                      No followers yet — share your profile to grow your network
                    </p>
                  ) : (
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">
                      {followCounts.followersCount} followers · {followCounts.followingCount} following
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFollowersDialogOpen(true)}
                aria-label="Open followers and following"
                className="p-2 border-2 border-border bg-card hover:bg-muted shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all shrink-0"
              >
                <ChevronRight className="size-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* 3. PUBLIC PROFILE URL + SOCIAL LINKS — from backend */}
          {!isPreviewMode && (
          <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)] space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest">Public Profile</h3>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Your profile link. Copy or share.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyProfileUrl}
                className="flex-1 min-w-0 flex items-center justify-between gap-2 bg-muted/30 border-2 border-border p-3 hover:bg-muted/50 transition-colors text-left group"
              >
                <span className="text-[10px] font-bold truncate text-foreground">
                  {publicProfileUrl || (typeof window !== 'undefined' ? `${window.location.origin}/profile` : '/profile')}
                </span>
                <span className={cn(
                  'shrink-0 flex items-center gap-1.5 px-2 py-1 border-2 border-border text-[9px] font-black uppercase',
                  profileUrlCopied ? 'bg-primary text-primary-foreground border-primary' : 'bg-card group-hover:border-primary'
                )}>
                  {profileUrlCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {profileUrlCopied ? 'Copied' : 'Copy'}
                </span>
              </button>
            </div>
            <div className="flex gap-3 items-center justify-center pt-1 flex-wrap">
              {user?.linkedin && (
                <a href={user.linkedin.startsWith('http') ? user.linkedin : `https://${user.linkedin}`} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="p-2 border-2 border-border bg-muted/30 hover:bg-muted/60 hover:border-primary transition-colors">
                  <Linkedin className="size-4 text-foreground" />
                </a>
              )}
              {user?.github && (
                <a href={user.github.startsWith('http') ? user.github : `https://${user.github}`} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="p-2 border-2 border-border bg-muted/30 hover:bg-muted/60 hover:border-primary transition-colors">
                  <Github className="size-4 text-foreground" />
                </a>
              )}
              {user?.instagram && (
                <a href={user.instagram.startsWith('http') ? user.instagram : `https://${user.instagram}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-2 border-2 border-border bg-muted/30 hover:bg-muted/60 hover:border-primary transition-colors">
                  <Instagram className="size-4 text-foreground" />
                </a>
              )}
              {user?.youtube && (
                <a href={user.youtube.startsWith('http') ? user.youtube : `https://${user.youtube}`} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="p-2 border-2 border-border bg-muted/30 hover:bg-muted/60 hover:border-primary transition-colors">
                  <Youtube className="size-4 text-foreground" />
                </a>
              )}
            </div>
          </div>
          )}

          <FollowersFollowingDialog
            open={followersDialogOpen}
            onClose={() => setFollowersDialogOpen(false)}
            username={user?.username ?? null}
            currentUserUsername={user?.username ?? null}
            token={token}
            followersCount={followCounts.followersCount}
            followingCount={followCounts.followingCount}
            onFollowChange={() => {
              if (user?.username) {
                followApi.getFollowCounts(user.username).then((res) => {
                  if (res.success) setFollowCounts({ followersCount: res.followersCount, followingCount: res.followingCount });
                }).catch(() => {});
              }
            }}
          />

          {/* 3. PROFILE ACTIVITY - Text left, graph right, reduced height */}
          <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                Profile Activity <span className="size-4 bg-muted text-[8px] flex items-center justify-center border-2 border-border">?</span>
              </h3>
              {!isPreviewMode && (
                <Link
                  href="/profile/analytics"
                  className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-border bg-card font-black text-[9px] uppercase tracking-widest hover:bg-muted hover:border-primary transition-colors shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  <BarChart2 className="size-3.5" /> Detailed analysis
                </Link>
              )}
            </div>
            {overviewMetrics && (
              <div className="mb-3 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
                <span className="inline-flex items-center gap-1 px-2 py-1 border-2 border-border bg-muted/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Today {overviewMetrics.viewsToday ?? 0}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 border-2 border-border bg-muted/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  New (7d) {overviewMetrics.uniqueVisitors7Days ?? 0}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 border-2 border-border bg-muted/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Returning (7d) {overviewMetrics.repeatVisitors7Days ?? 0}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              {/* Views this week: chart only when we have at least 2 days of real week data */}
              <div className="flex flex-row items-stretch min-h-0 p-3 border-2 border-border bg-muted/5 shadow-[2px_2px_0px_0px_var(--border)]">
                <div className={`flex flex-col justify-center shrink-0 text-left ${showWeekChart ? 'pr-4' : ''}`}>
                  <p className="text-lg font-black italic leading-none">
                    {overviewMetrics ? (overviewMetrics.views7Days ?? 0) : 0}
                  </p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">Views this week</p>
                  <p className="text-[9px] font-black mt-0.5 text-primary">
                    {overviewMetrics ? `${overviewMetrics.uniqueVisitors7Days ?? 0} visitors` : '—'}
                  </p>
                </div>
                {showWeekChart ? (
                  <div className="flex-1 min-w-0 h-14 overflow-hidden flex items-center">
                    <AreaChart
                      data={weekChartData}
                      index="name"
                      categories={['views']}
                      height={56}
                      sparkline
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 h-14 flex items-center justify-center border-2 border-dashed border-border bg-muted/5 rounded-sm">
                    <Link href="/profile/analytics" className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors">
                      View detailed analysis
                    </Link>
                  </div>
                )}
              </div>
              {/* Views this month: chart only when we have at least 7 days of data */}
              <div className="flex flex-row items-stretch min-h-0 p-3 border-2 border-border bg-muted/5 shadow-[2px_2px_0px_0px_var(--border)]">
                <div className={`flex flex-col justify-center shrink-0 text-left ${showMonthChart ? 'pr-4' : ''}`}>
                  <p className="text-lg font-black italic leading-none">
                    {overviewMetrics ? (overviewMetrics.views30Days ?? 0) : 0}
                  </p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">Views this month</p>
                  <p className="text-[9px] font-black mt-0.5 text-primary">
                    {overviewMetrics ? `${overviewMetrics.repeatVisitors7Days ?? 0} repeat` : '—'}
                  </p>
                </div>
                {showMonthChart ? (
                  <div className="flex-1 min-w-0 h-14 overflow-hidden flex items-center">
                    <AreaChart
                      data={monthChartData}
                      index="name"
                      categories={['views']}
                      height={56}
                      sparkline
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 h-14 flex items-center justify-center border-2 border-dashed border-border bg-muted/5 rounded-sm">
                    <Link href="/profile/analytics" className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors">
                      View detailed analysis
                    </Link>
                  </div>
                )}
              </div>
              {/* Total profile views: chart only when we have at least 7 days (same 30d trend) */}
              <div className="flex flex-row items-stretch min-h-0 p-3 border-2 border-border bg-muted/5 shadow-[2px_2px_0px_0px_var(--border)]">
                <div className={`flex flex-col justify-center shrink-0 text-left ${showTotalChart ? 'pr-4' : ''}`}>
                  <p className="text-lg font-black italic leading-none">
                    {overviewMetrics ? (overviewMetrics.totalViews ?? 0) : 0}
                  </p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">Total profile views</p>
                  <p className="text-[9px] font-black mt-0.5 text-primary text-muted-foreground">
                    Lifetime (last 30 days window)
                  </p>
                </div>
                {showTotalChart ? (
                  <div className="flex-1 min-w-0 h-14 overflow-hidden flex items-center">
                    <AreaChart
                      data={monthChartData}
                      index="name"
                      categories={['views']}
                      height={56}
                      sparkline
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 h-14 flex items-center justify-center border-2 border-dashed border-border bg-muted/5 rounded-sm">
                    <Link href="/profile/analytics" className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors">
                      View detailed analysis
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. PERFORMANCE & READING OVERVIEW - Stats restored */}
          <div className="border-4 border-border bg-card p-5 shadow-[8px_8px_0px_0px_var(--border)] space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" /> Performance
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                <div className="text-lg font-black italic flex items-center gap-2">
                  1 <StreakFireLottie play size={28} />
                </div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">Longest streak</p>
              </div>
              <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                <p className="text-lg font-black italic">3</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">Total reading days</p>
              </div>
            </div>

            {/* Tags bars */}
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase text-muted-foreground">Top tags</p>
              {[
                { tag: 'AI', pct: '80%', val: '+50%' },
                { tag: 'React', pct: '45%', val: '+20%' },
              ].map((item) => (
                <div key={item.tag} className="space-y-1">
                  <div className="flex justify-between text-[8px] font-black uppercase">
                    <span>{item.tag}</span>
                    <span>{item.val}</span>
                  </div>
                  <div className="h-2.5 bg-muted border-2 border-border">
                    <div className="h-full bg-primary" style={{ width: item.pct }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Activity Grid: Posts, Replies, Upvoted counts Restored */}
            <div className="space-y-3 pt-2">
              <p className="text-[9px] font-black uppercase text-muted-foreground">Activity Summary</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 border-2 border-border bg-card text-center shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-sm font-black italic">0</p>
                  <p className="text-[7px] font-bold uppercase text-muted-foreground">Posts</p>
                </div>
                <div className="p-2 border-2 border-border bg-card text-center shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-sm font-black italic">0</p>
                  <p className="text-[7px] font-bold uppercase text-muted-foreground">Replies</p>
                </div>
                <div className="p-2 border-2 border-border bg-card text-center shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-sm font-black italic">0</p>
                  <p className="text-[7px] font-bold uppercase text-muted-foreground">Upvoted</p>
                </div>
              </div>
            </div>

            {/* Heatmap with hidden scrollbar restored */}
            <div className="pt-2 space-y-2">
              <p className="text-[9px] font-black uppercase text-muted-foreground">Contribution Heatmap</p>
              <div className="overflow-x-auto hide-scrollbar border-2 border-border p-2 bg-muted/5">
                <div className="min-w-[400px]">
                  <ProfileHeatmap />
                </div>
              </div>
            </div>
          </div>

          {/* 5. ACHIEVEMENTS restored */}
          <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
               <Award className="size-4 text-primary" /> Achievements
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black italic">1/56</span>
              <Link href="/achievements" className="text-[9px] font-black text-primary uppercase hover:underline">
                View all
              </Link>
            </div>
            <div className="h-2 bg-muted border-2 border-border mt-3">
              <div className="h-full bg-primary" style={{ width: '2%' }} />
            </div>
          </div>

          {/* 6. BADGES & AWARDS restored */}
          <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest">Badges & Awards</h3>
              <span className="text-[9px] font-black text-primary uppercase cursor-pointer hover:underline">Learn more</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b-2 border-border border-dashed">
                <span className="text-[9px] font-bold uppercase text-muted-foreground">Top reader badge</span>
                <span className="text-xs font-black">x0</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[9px] font-bold uppercase text-muted-foreground">Total Awards</span>
                <span className="text-xs font-black">x0</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}