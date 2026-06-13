'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { followApi, type ReadStreakPayload } from '@/api/follow';
import { analyticsApi, type ProfileOverviewMetrics, type ProfileTimePoint } from '@/api/analytics';
import {
  Edit3,
  Plus,
  Monitor,
  Users,
  Award,
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
  Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/core/utils';
import { setWriteEditorSessionPostId } from '@/lib/blog/writeBlogSession';
import { AreaChart } from '@/components/retroui';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { achievementsApi } from '@/api/achievements';
import type { AchievementProgressItemDto } from '@/contracts/achievementsApi';
import { RecentAchievementsPreview } from '@/features/achievements/components/RecentAchievementsPreview';
import { ProfileActivitySparklinePlaceholder } from '@/features/profile/components/ProfileActivitySparklinePlaceholder';
import { ProfileCardSkeleton } from '@/components/skeletons';
import { ProfileSectionHeader, ProfileActivityTabs } from '@/features/profile';
import {
  SparkLottie,
  StreakFireLottie,
  TestAccountLottie,
  ProfileActivityIconLottie,
} from '@/components/ui';
import { ProfileHeatmap } from '@/features/profile';
import { ProfileActivityBlogList, ProfileActivitySwiperNav, profileBlogsPageHref } from '@/features/blog';
import type { CompactBlogPostsSwiperHandle } from '@/features/blog';
import {
  FollowersFollowingDialog,
  MediaFullViewDialog,
  ProfileSquadsCategoriesCard,
} from '@/features/profile';
import { StackToolsBadgeList } from '@/features/profile/components/StackToolsBadgeList';
import { ProfilePageSkeletonInner } from '@/components/skeletons';
import { CertificationCard } from '@/components/settings-list/CertificationCard';
import { ProjectCard } from '@/components/settings-list/ProjectCard';
import { OpenSourceCard } from '@/components/settings-list/OpenSourceCard';
import { ProfileSectionAccordion, type ProfileSectionVariant } from '@/components/ui/editor';
import { HoverCard } from '@/components/ui/popover';
import { LinkPreviewCardContent } from '@/components/ui/popover';
import {
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from '@/components/icons/SocialProviderIcons';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { PROFILE_PUBLIC_SOCIAL_BTN } from '@/lib/profile/profilePublicCard';
import {
  certificationListKey,
  domainFromUrl,
  entriesCountSubtitle,
  formatJoinedDate,
  formatMonthYear,
  isImageUrl,
  isPlaceholderProfileBio,
  locationWithoutType,
  markdownBioToHtml,
  normalizeDomain,
  openSourceListKey,
  profileSectionMinVisible,
  projectListKey,
  reposCountSubtitle,
} from '@/lib/profile/profileDisplay';
import {
  type ActivityTab,
} from '../lib/profilePageHelpers';

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isHydrated, shouldBlock } = useRequireAuth();
  const [activityTab, setActivityTab] = useState<ActivityTab>('posts');
  const activitySwiperRef = useRef<CompactBlogPostsSwiperHandle>(null);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [profileUrlCopied, setProfileUrlCopied] = useState(false);
  const [mySetupPreview, setMySetupPreview] = useState<{ src: string; title: string } | null>(null);
  const [followCounts, setFollowCounts] = useState({ followersCount: 0, followingCount: 0 });
  const [readStreak, setReadStreak] = useState<ReadStreakPayload | null>(null);
  const [readHeatmapDays, setReadHeatmapDays] = useState<string[] | null>(null);
  const [achievementSummary, setAchievementSummary] = useState({ unlocked: 0, total: 10 });
  const [achievementItems, setAchievementItems] = useState<AchievementProgressItemDto[]>([]);
  const [overviewMetrics, setOverviewMetrics] = useState<ProfileOverviewMetrics | null>(null);
  const [timeSeries, setTimeSeries] = useState<ProfileTimePoint[]>([]);
  /** Only one section accordion open at a time; default Certifications */
  const [openSectionId, setOpenSectionId] = useState<ProfileSectionVariant | null>(
    'certification'
  );
  const accordionsRootRef = useRef<HTMLDivElement>(null);

  const [visibleCounts, setVisibleCounts] = useState<Record<ProfileSectionVariant, number>>({
    certification: 1,
    project: 1,
    openSource: 2,
    mySetup: 2,
  });
  const [sectionLoading, setSectionLoading] = useState<Record<ProfileSectionVariant, boolean>>({
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
      [variant]: profileSectionMinVisible(variant, prev[variant]),
    }));
    setSectionLoading((prev) => ({ ...prev, [variant]: true }));
    globalThis.setTimeout(() => {
      setSectionLoading((prev) => ({ ...prev, [variant]: false }));
    }, 420);
  };

  const viewMore = (variant: ProfileSectionVariant, step = 1) => {
    setSectionLoading((prev) => ({ ...prev, [variant]: true }));
    globalThis.setTimeout(() => {
      setVisibleCounts((prev) => ({ ...prev, [variant]: (prev[variant] ?? 0) + step }));
      setSectionLoading((prev) => ({ ...prev, [variant]: false }));
    }, 420);
  };

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
    followApi
      .getPublicProfile(user.username)
      .then((res) => {
        if (res.success) {
          setFollowCounts({
            followersCount: res.followersCount,
            followingCount: res.followingCount,
          });
          setReadStreak(res.readStreak ?? null);
          setReadHeatmapDays(res.readHeatmapDays ?? null);
        }
      })
      .catch(() => {});
  }, [user?.username]);

  useEffect(() => {
    if (!token) return;
    achievementsApi
      .list(token)
      .then((data) => {
        if (data.success) {
          setAchievementItems(data.items);
          setAchievementSummary({ unlocked: data.unlockedCount, total: data.total });
        }
      })
      .catch(() => {});
  }, [token]);

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
    if (globalThis.window === undefined || !user?.username) return '';
    return `${globalThis.window.location.origin}/u/${user.username}`;
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

  const profileShareUrl = useMemo(() => {
    if (publicProfileUrl) return publicProfileUrl;
    if (globalThis.window !== undefined) return `${globalThis.window.location.origin}/profile`;
    return '/profile';
  }, [publicProfileUrl]);

  const copyProfileUrl = async () => {
    try {
      await navigator.clipboard.writeText(profileShareUrl);
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
      repoFullName: (c as { repoFullName?: string }).repoFullName ?? c.repository ?? c.title,
      publicationUrl:
        (c as { publicationUrl?: string }).publicationUrl ??
        (c as { repositoryUrl?: string }).repositoryUrl ??
        (c as { url?: string }).url,
    }));
    return [...fromProjects, ...fromContributions].slice(0, 7);
  }, [profileProjects.github, user?.openSourceContributions]);

  if (!isHydrated || shouldBlock) {
    return <ProfilePageSkeletonInner />;
  }

  const goToSettingsSection = (section: string, opts?: { editIndex?: number }) => {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('settingsTargetSection', section);
        if (opts?.editIndex != null) {
          window.sessionStorage.setItem('settingsTargetEditIndex', String(opts.editIndex));
        } else {
          window.sessionStorage.removeItem('settingsTargetEditIndex');
        }
      } catch {
        // ignore
      }
    }
    router.push('/settings');
  };

  return (
    <div className="min-h-screen w-full font-sans text-foreground ss-profile-readonly">
      <div className={SHELL_CONTENT_RAIL_CLASS}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* ================= LEFT COLUMN ================= */}
          <div className="lg:col-span-8 space-y-8">
            {/* HEADER SECTION */}
            <section className="border-4 border-border bg-card shadow overflow-hidden">
              {/* Cover: user cover or gradient */}
              <div className="h-48 relative border-b-4 border-border overflow-hidden">
                {user?.coverBanner ? (
                  <img
                    src={user.coverBanner}
                    alt={user.coverBannerAlt?.trim() || 'Cover banner'}
                    title={user.coverBannerAlt?.trim() || undefined}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full gradient-auto" />
                )}
              </div>

              <div className="px-6 pb-8 pt-24 md:pt-32 relative bg-card">
                <div className="absolute -top-14 left-6 size-28 md:size-36 border-4 border-border bg-muted shadow overflow-hidden">
                  <img
                    src={
                      user?.profileImg ||
                      user?.image ||
                      'https://api.dicebear.com/7.x/avataaars/svg?seed=user'
                    }
                    alt={user?.profileImgAlt?.trim() || 'Profile photo'}
                    title={user?.profileImgAlt?.trim() || undefined}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <h1 className="text-4xl font-black uppercase tracking-tighter italic">
                        {user?.fullName || user?.name || 'Profile'}
                      </h1>
                      <div className="text-primary font-bold flex items-center gap-2 mt-1  text-xs tracking-widest">
                        <span>{user?.username ? `@${user.username}` : ''}</span>
                        {user?.portfolioUrl?.trim() ? (
                          <HoverCard
                            content={
                              <LinkPreviewCardContent
                                domain={user.portfolioUrl}
                                title="Portfolio"
                              />
                            }
                            side="top"
                            align="start"
                            contentClassName="w-[280px] p-0"
                          >
                            <a
                              href={
                                user.portfolioUrl.trim().startsWith('http')
                                  ? user.portfolioUrl.trim()
                                  : `https://${user.portfolioUrl.trim()}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Open portfolio"
                              className="inline-flex items-center justify-center size-7 border-2 border-border bg-card text-foreground hover:bg-muted shadow"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="size-4 text-primary" />
                            </a>
                          </HoverCard>
                        ) : null}
                        {joinedLabel && (
                          <>
                            <span className="size-1.5 bg-border" /> {joinedLabel}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 md:pt-1">
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 border-2 border-border bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow active:shadow-none transition-all"
                      >
                        <Edit3 className="size-3.5" /> Edit Profile
                      </Link>
                    </div>
                  </div>

                  {user?.bio?.trim() && !isPlaceholderProfileBio(user.bio) ? (
                    <div
                      className="text-sm text-foreground/80 font-medium leading-relaxed max-w-none [&_strong]:text-primary [&_strong]:font-black [&_u]:decoration-primary/50 [&_em]:italic [&_em]:text-foreground"
                      dangerouslySetInnerHTML={{ __html: markdownBioToHtml(user.bio) }}
                    />
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-sm text-muted-foreground italic mb-4">No bio yet.</p>
                      <Link
                        href="/settings"
                        className="px-4 py-2 border-2 border-primary text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        Add bio
                      </Link>
                    </div>
                  )}
                </div>

                {/* Stats Bar */}
                <div className="flex flex-wrap gap-6 mt-8 p-4 border-4 border-gray-300 dark:border-border border-dashed bg-muted/5">
                  <div className="flex items-center gap-2">
                    <SparkLottie play size={24} />
                    <span className="font-black text-sm uppercase">10</span>
                    <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">
                      Respect
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StreakFireLottie play size={24} />
                    <span className="font-black text-sm uppercase">{readStreak?.current ?? 0}</span>
                    <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">
                      Read streak
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <span className="font-black text-sm uppercase">
                      {followCounts.followersCount}
                    </span>
                    <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">
                      Followers
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <span className="font-black text-sm uppercase">
                      {followCounts.followingCount}
                    </span>
                    <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">
                      Following
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ACTIVITY TABS */}
            <section className="space-y-4 border-4 border-border bg-card shadow p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <Activity className="size-4 text-primary" /> Activity
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {user?.username ? (
                    <Link
                      href={profileBlogsPageHref(user.username)}
                      className="flex items-center gap-2 px-3 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest shadow hover:bg-muted transition-all"
                    >
                      View all
                    </Link>
                  ) : null}
                  <Link
                    href="/blogs/write"
                    onClick={() => setWriteEditorSessionPostId(null)}
                    className="flex items-center gap-2 px-3 py-2 border-2 border-border bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    <PenSquare className="size-3.5" /> Add post
                  </Link>
                  {user?.username ? <ProfileActivitySwiperNav swiperRef={activitySwiperRef} /> : null}
                </div>
              </div>
              <ProfileActivityTabs
                tabs={['posts', 'replies', 'repost']}
                value={activityTab}
                onChange={setActivityTab}
              />
              {user?.username ? (
                <ProfileActivityBlogList
                  key={activityTab}
                  ref={activitySwiperRef}
                  username={user.username}
                  kind={activityTab}
                  accessToken={token}
                />
              ) : null}
            </section>

            <MediaFullViewDialog
              open={!!mySetupPreview}
              onClose={() => setMySetupPreview(null)}
              src={mySetupPreview?.src ?? ''}
              title={mySetupPreview?.title}
            />

            {/* DYNAMIC SECTIONS — data from backend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="space-y-4 border-4 border-border bg-card p-4 shadow">
                <ProfileSectionHeader
                  icon={Monitor}
                  title="Stack & Tools"
                  onAddClick={() => goToSettingsSection('stack-tools')}
                />
                {user?.stackAndTools?.length ? (
                  <div className="relative">
                    <StackToolsBadgeList
                      names={user.stackAndTools}
                      displayItems={user.stackAndToolsDisplay}
                    />
                  </div>
                ) : (
                  <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Add your tech stack
                    </p>
                    <button
                      type="button"
                      onClick={() => goToSettingsSection('stack-tools')}
                      className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline"
                    >
                      <Plus className="size-3" /> Add
                    </button>
                  </div>
                )}
              </section>

              <section className="space-y-4 border-4 border-border bg-card p-4 shadow">
                <ProfileSectionHeader
                  icon={Wrench}
                  title="My Setup"
                  onAddClick={() => goToSettingsSection('my-setup')}
                />
                {(user as any)?.mySetup?.length ? (
                  <div className="relative">
                    <div className="flex gap-3 overflow-x-auto ss-scrollbar-hide py-1 pr-1 snap-x">
                      {(
                        (user as any).mySetup as Array<{
                          label: string;
                          imageUrl: string;
                          productUrl?: string;
                          imageAlt?: string;
                        }>
                      )
                        .slice(0, 5)
                        .map((it) => {
                          const hasProduct = Boolean((it.productUrl ?? '').trim());
                          const setupImgLabel = it.imageAlt?.trim() || it.label;
                          return (
                            <div
                              key={`setup-${it.imageUrl}-${it.label}`}
                              className="snap-start shrink-0 w-[240px] border-2 border-border bg-muted/10 shadow overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setMySetupPreview({ src: it.imageUrl, title: setupImgLabel })
                                }
                                className="relative block h-28 w-full cursor-zoom-in border-b-2 border-border bg-muted/20 overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                aria-label={`View ${it.label} image larger`}
                              >
                                <img
                                  src={it.imageUrl}
                                  alt={setupImgLabel}
                                  title={it.imageAlt?.trim() || undefined}
                                  className="h-full w-full object-cover transition-opacity hover:opacity-90"
                                  loading="lazy"
                                />
                              </button>
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
                                  <div className="mt-2 text-[10px] font-bold uppercase text-muted-foreground">
                                    No link
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Add your setup
                    </p>
                    <button
                      type="button"
                      onClick={() => goToSettingsSection('my-setup')}
                      className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline"
                    >
                      <Plus className="size-3" /> Add
                    </button>
                  </div>
                )}
              </section>
            </div>

            <div ref={accordionsRootRef} className="space-y-6">
              <ProfileSectionAccordion
                variant="certification"
                open={openSectionId === 'certification'}
                onOpenChange={(open) => setSectionOpen('certification', open)}
                subtitle={entriesCountSubtitle(user?.certifications?.length ?? 0)}
                headerAction={
                  <div
                    role="button"
                    tabIndex={0}
                    className="text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-1 bg-card shadow active:shadow-none active:translate-x-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToSettingsSection('certifications');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        goToSettingsSection('certifications');
                      }
                    }}
                  >
                    <Plus className="size-3" /> Add
                  </div>
                }
              >
                {user?.certifications?.length ? (
                  <div className="space-y-4">
                    {sectionLoading.certification ? (
                      <ProfileCardSkeleton lines={4} />
                    ) : (
                      user.certifications
                        .slice(0, visibleCounts.certification)
                        .map((c, i) => (
                          <CertificationCard
                            key={certificationListKey(c as Record<string, unknown>)}
                            cert={c}
                            index={i}
                            saving={false}
                            onEdit={() => goToSettingsSection('certifications', { editIndex: i })}
                            onRemove={() => {}}
                            onPreviewMedia={() => {}}
                            formatMonthYear={formatMonthYear}
                            domainFromUrl={domainFromUrl}
                            isImageUrl={isImageUrl}
                            hideActions
                          />
                        ))
                    )}

                    {user.certifications.length > visibleCounts.certification ? (
                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={sectionLoading.certification}
                          onClick={() => viewMore('certification', 1)}
                          className="w-full px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
                        >
                          {sectionLoading.certification
                            ? 'LOADING…'
                            : `View more (${visibleCounts.certification}/${user.certifications.length})`}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Add certifications
                    </p>
                    <button
                      type="button"
                      onClick={() => goToSettingsSection('certifications')}
                      className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline"
                    >
                      <Plus className="size-3" /> Add
                    </button>
                  </div>
                )}
              </ProfileSectionAccordion>

              <ProfileSectionAccordion
                variant="project"
                open={openSectionId === 'project'}
                onOpenChange={(open) => setSectionOpen('project', open)}
                subtitle={entriesCountSubtitle(profileProjects.nonGithub.length)}
                headerAction={
                  <div
                    role="button"
                    tabIndex={0}
                    className="text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-1 bg-card shadow active:shadow-none active:translate-x-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToSettingsSection('projects');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        goToSettingsSection('projects');
                      }
                    }}
                  >
                    <Plus className="size-3" /> Add
                  </div>
                }
              >
                {profileProjects.nonGithub.length > 0 ? (
                  <div className="space-y-4">
                    {sectionLoading.project ? (
                      <ProfileCardSkeleton lines={4} />
                    ) : (
                      profileProjects.nonGithub
                        .slice(0, visibleCounts.project)
                        .map((p, i) => (
                          <ProjectCard
                            key={projectListKey(p as Record<string, unknown>)}
                            project={p}
                            index={i}
                            saving={false}
                            onEdit={() => goToSettingsSection('projects', { editIndex: i })}
                            onRemove={() => {}}
                            onPreviewMedia={() => {}}
                            formatMonthYear={formatMonthYear}
                            domainFromUrl={domainFromUrl}
                            isImageUrl={isImageUrl}
                            hideActions
                          />
                        ))
                    )}

                    {profileProjects.nonGithub.length > visibleCounts.project ? (
                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={sectionLoading.project}
                          onClick={() => viewMore('project', 1)}
                          className="w-full px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
                        >
                          {sectionLoading.project
                            ? 'LOADING…'
                            : `View more (${visibleCounts.project}/${profileProjects.nonGithub.length})`}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Add your projects
                    </p>
                    <button
                      type="button"
                      onClick={() => goToSettingsSection('projects')}
                      className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline"
                    >
                      <Plus className="size-3" /> Add
                    </button>
                  </div>
                )}
              </ProfileSectionAccordion>

              <ProfileSectionAccordion
                variant="openSource"
                open={openSectionId === 'openSource'}
                onOpenChange={(open) => setSectionOpen('openSource', open)}
                subtitle={reposCountSubtitle(openSourceList.length)}
                headerAction={
                  <div
                    role="button"
                    tabIndex={0}
                    className="text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-1 bg-card shadow active:shadow-none active:translate-x-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToSettingsSection('open-source');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        goToSettingsSection('open-source');
                      }
                    }}
                  >
                    <Plus className="size-3" /> Add
                  </div>
                }
              >
                {openSourceList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sectionLoading.openSource ? (
                      <>
                        <ProfileCardSkeleton lines={3} />
                        <ProfileCardSkeleton lines={3} />
                      </>
                    ) : (
                      openSourceList.slice(0, visibleCounts.openSource).map((item, i) => (
                        <OpenSourceCard
                          key={openSourceListKey(item as Record<string, unknown>)}
                          item={item}
                          index={i}
                          saving={false}
                          onOpen={() => {
                            const url =
                              (item as { publicationUrl?: string }).publicationUrl ??
                              (item as { url?: string }).url ??
                              (item as { repositoryUrl?: string }).repositoryUrl;
                            if (url) globalThis.open(url, '_blank', 'noopener,noreferrer');
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
                          {sectionLoading.openSource
                            ? 'LOADING…'
                            : `View more (${Math.min(visibleCounts.openSource, openSourceList.length)}/${openSourceList.length})`}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Add contributions
                    </p>
                    <button
                      type="button"
                      onClick={() => goToSettingsSection('open-source')}
                      className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline"
                    >
                      <Plus className="size-3" /> Add contribution
                    </button>
                  </div>
                )}
              </ProfileSectionAccordion>
            </div>
          </div>

          {/* ================= RIGHT COLUMN ================= */}
          <div className="lg:col-span-4 space-y-6">
            {/* 1. FOLLOWERS / FOLLOWING CARD */}
            <button
              type="button"
              onClick={() => setFollowersDialogOpen(true)}
              aria-label="Open followers and following"
              className="w-full border-4 border-border bg-card p-4 shadow text-left transition-transform active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 border-2 border-border bg-muted/50 flex items-center justify-center shrink-0">
                    <Users className="size-4 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase">Followers & Following</p>
                    {followCounts.followersCount === 0 && followCounts.followingCount === 0 ? (
                      <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">
                        No followers yet
                      </p>
                    ) : (
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">
                        {followCounts.followersCount} followers · {followCounts.followingCount}{' '}
                        following
                      </p>
                    )}
                  </div>
                </div>
                <span className="p-2 border-2 border-border bg-card shrink-0" aria-hidden>
                  <ChevronRight className="size-4 text-foreground" />
                </span>
              </div>
            </button>

            <ProfileSquadsCategoriesCard
              username={user?.username ?? null}
              userId={user?.id ?? user?._id ?? null}
              token={token}
              isSelf
            />

            {/* 2. PUBLIC PROFILE URL + SOCIAL LINKS — from backend */}
            <div className="border-4 border-border bg-card p-5 shadow space-y-4">
              <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <TestAccountLottie size={24} />
                Public Profile
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyProfileUrl}
                  className="group flex min-w-0 flex-1 items-center justify-between gap-3 border-2 border-border bg-muted/20 p-2.5 pl-3 text-left shadow transition-colors hover:bg-muted/40 active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  <Link2 className="size-4 shrink-0 text-primary" strokeWidth={2.25} aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold text-foreground">
                    {profileShareUrl}
                  </span>
                  <span
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 border-2 border-border px-2.5 py-1.5 text-[9px] font-black uppercase',
                      profileUrlCopied
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card group-hover:border-primary'
                    )}
                  >
                    {profileUrlCopied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {profileUrlCopied ? 'Copied' : 'Copy'}
                  </span>
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                {user?.linkedin && (
                  <a
                    href={
                      user.linkedin.startsWith('http') ? user.linkedin : `https://${user.linkedin}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className={PROFILE_PUBLIC_SOCIAL_BTN}
                  >
                    <LinkedinIcon className="size-5 text-[#0A66C2]" />
                  </a>
                )}
                {user?.github && (
                  <a
                    href={user.github.startsWith('http') ? user.github : `https://${user.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                    className={PROFILE_PUBLIC_SOCIAL_BTN}
                  >
                    <GithubIcon className="size-5 text-[#24292f] dark:text-[#f0f6fc]" />
                  </a>
                )}
                {user?.instagram && (
                  <a
                    href={
                      user.instagram.startsWith('http')
                        ? user.instagram
                        : `https://${user.instagram}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className={PROFILE_PUBLIC_SOCIAL_BTN}
                  >
                    <InstagramIcon className="size-5 text-[#E4405F]" />
                  </a>
                )}
                {user?.youtube && (
                  <a
                    href={
                      user.youtube.startsWith('http') ? user.youtube : `https://${user.youtube}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className={PROFILE_PUBLIC_SOCIAL_BTN}
                  >
                    <YoutubeIcon className="size-5 text-[#FF0000]" />
                  </a>
                )}
              </div>
            </div>

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
                  followApi
                    .getFollowCounts(user.username)
                    .then((res) => {
                      if (res.success)
                        setFollowCounts({
                          followersCount: res.followersCount,
                          followingCount: res.followingCount,
                        });
                    })
                    .catch(() => {});
                }
              }}
            />

            {/* 3. PROFILE ACTIVITY - Text left, graph right, reduced height */}
            <div className="border-4 border-border bg-card p-5 shadow">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <ProfileActivityIconLottie size={24} />
                  Profile Activity
                </h3>
                <Link
                  href="/profile/analytics"
                  className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-border bg-card font-black text-[9px] uppercase tracking-widest hover:bg-muted hover:border-primary transition-colors shadow active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  <BarChart2 className="size-3.5" /> Detailed analysis
                </Link>
              </div>
              {overviewMetrics && (
                <div className="mb-3 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
                  <span className="inline-flex items-center gap-1 px-2 py-1 border-2 border-border bg-muted/40">
                    <span className="w-1.5 h-1.5 bg-primary" />
                    Today {overviewMetrics.viewsToday ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 border-2 border-border bg-muted/30">
                    <span className="w-1.5 h-1.5 bg-emerald-500" />
                    New (7d) {overviewMetrics.uniqueVisitors7Days ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 border-2 border-border bg-muted/20">
                    <span className="w-1.5 h-1.5 bg-amber-500" />
                    Returning (7d) {overviewMetrics.repeatVisitors7Days ?? 0}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3">
                {/* Views this week: chart only when we have at least 2 days of real week data */}
                <div className="flex flex-row items-stretch min-h-0 p-3 border-2 border-border bg-muted/5 shadow">
                  <div className="flex flex-col justify-center shrink-0 pr-4 text-left">
                    <p className="text-lg font-black italic leading-none">
                      {overviewMetrics ? (overviewMetrics.views7Days ?? 0) : 0}
                    </p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">
                      Views this week
                    </p>
                    <p className="text-[9px] font-black mt-0.5 text-primary">
                      {overviewMetrics
                        ? `${overviewMetrics.uniqueVisitors7Days ?? 0} visitors`
                        : '—'}
                    </p>
                  </div>
                  <div
                    className="flex-1 min-w-0 h-14 overflow-hidden flex items-center"
                    aria-label={showWeekChart ? undefined : 'No activity data yet'}
                  >
                    {showWeekChart ? (
                      <AreaChart
                        data={weekChartData}
                        index="name"
                        categories={['views']}
                        height={56}
                        sparkline
                      />
                    ) : (
                      <ProfileActivitySparklinePlaceholder />
                    )}
                  </div>
                </div>
                {/* Views this month: chart only when we have at least 7 days of data */}
                <div className="flex flex-row items-stretch min-h-0 p-3 border-2 border-border bg-muted/5 shadow">
                  <div className="flex flex-col justify-center shrink-0 pr-4 text-left">
                    <p className="text-lg font-black italic leading-none">
                      {overviewMetrics ? (overviewMetrics.views30Days ?? 0) : 0}
                    </p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">
                      Views this month
                    </p>
                    <p className="text-[9px] font-black mt-0.5 text-primary">
                      {overviewMetrics ? `${overviewMetrics.repeatVisitors7Days ?? 0} repeat` : '—'}
                    </p>
                  </div>
                  <div
                    className="flex-1 min-w-0 h-14 overflow-hidden flex items-center"
                    aria-label={showMonthChart ? undefined : 'No activity data yet'}
                  >
                    {showMonthChart ? (
                      <AreaChart
                        data={monthChartData}
                        index="name"
                        categories={['views']}
                        height={56}
                        sparkline
                      />
                    ) : (
                      <ProfileActivitySparklinePlaceholder />
                    )}
                  </div>
                </div>
                {/* Total profile views: chart only when we have at least 7 days (same 30d trend) */}
                <div className="flex flex-row items-stretch min-h-0 p-3 border-2 border-border bg-muted/5 shadow">
                  <div className="flex flex-col justify-center shrink-0 pr-4 text-left">
                    <p className="text-lg font-black italic leading-none">
                      {overviewMetrics ? (overviewMetrics.totalViews ?? 0) : 0}
                    </p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">
                      Total profile views
                    </p>
                    <p className="text-[9px] font-black mt-0.5 text-primary text-muted-foreground">
                      Lifetime (last 30 days window)
                    </p>
                  </div>
                  <div
                    className="flex-1 min-w-0 h-14 overflow-hidden flex items-center"
                    aria-label={showTotalChart ? undefined : 'No activity data yet'}
                  >
                    {showTotalChart ? (
                      <AreaChart
                        data={monthChartData}
                        index="name"
                        categories={['views']}
                        height={56}
                        sparkline
                      />
                    ) : (
                      <ProfileActivitySparklinePlaceholder />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. PERFORMANCE & READING OVERVIEW - Stats restored */}
            <div className="border-4 border-border bg-card p-5 shadow space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" /> Performance
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                  <div className="text-lg font-black italic flex items-center gap-2">
                    {readStreak?.longest ?? 0} <StreakFireLottie play size={28} />
                  </div>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">
                    Longest read streak
                  </p>
                </div>
                <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                  <p className="text-lg font-black italic">
                    {readStreak?.totalDistinctReadDays ?? 0}
                  </p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">
                    Total reading days
                  </p>
                </div>
              </div>

              {/* Activity Grid: Posts, Replies, Upvoted counts Restored */}
              <div className="space-y-3 pt-2">
                <p className="text-[9px] font-black uppercase text-muted-foreground">
                  Activity Summary
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 border-2 border-border bg-card text-center shadow">
                    <p className="text-sm font-black italic">0</p>
                    <p className="text-[7px] font-bold uppercase text-muted-foreground">Posts</p>
                  </div>
                  <div className="p-2 border-2 border-border bg-card text-center shadow">
                    <p className="text-sm font-black italic">0</p>
                    <p className="text-[7px] font-bold uppercase text-muted-foreground">Reposts</p>
                  </div>
                  <div className="p-2 border-2 border-border bg-card text-center shadow">
                    <p className="text-sm font-black italic">0</p>
                    <p className="text-[7px] font-bold uppercase text-muted-foreground">Respect</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <p className="text-[9px] font-black uppercase text-muted-foreground">
                  Reading activity
                </p>
                <div className="w-full min-w-0 max-w-full border-2 border-border p-2 bg-muted/5">
                  <ProfileHeatmap readHeatmapDays={readHeatmapDays} />
                </div>
              </div>
            </div>

            {/* 5. ACHIEVEMENTS restored */}
            <div className="border-4 border-border bg-card p-5 shadow">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <Award className="size-4 text-primary" /> Achievements
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black italic">
                  {achievementSummary.unlocked}/{achievementSummary.total}
                </span>
                <Link
                  href="/achievements"
                  className="text-[9px] font-black text-primary uppercase hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="h-2 bg-muted border-2 border-border mt-3">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${achievementSummary.total > 0 ? (achievementSummary.unlocked / achievementSummary.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <RecentAchievementsPreview items={achievementItems} className="mt-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
