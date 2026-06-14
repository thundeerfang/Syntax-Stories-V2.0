"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { followApi, type ReadStreakPayload } from "@/api/follow";
import {
  analyticsApi,
  type ProfileOverviewMetrics,
  type ProfileTimePoint,
} from "@/api/analytics";
import {
  Edit3,
  Plus,
  Monitor,
  Users,
  Award,
  TrendingUp,
  ChevronRight,
  Activity,
  PenSquare,
  BarChart2,
  Wrench,
  ExternalLink,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/core/utils";
import { setWriteEditorSessionPostId } from "@/lib/blog/writeBlogSession";
import { AreaChart } from "@/components/retroui";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { achievementsApi } from "@/api/achievements";
import type { AchievementProgressItemDto } from "@/contracts/achievementsApi";
import { RecentAchievementsPreview } from "@/components/achievements";
import {
  ProfileActivitySparklinePlaceholder,
  ProfilePortfolioAccordions,
  ProfileShareUrlCopyRow,
  StackToolsBadgeList,
} from "@/components/profile";
import { ProfileCardSkeleton } from "@/components/skeletons";
import { ProfileSectionHeader, ProfileActivityTabs } from "@/features/profile";
import {
  SparkLottie,
  StreakFireLottie,
  TestAccountLottie,
  ProfileActivityIconLottie,
} from "@/components/ui";
import { ProfileHeatmap } from "@/features/profile";
import {
  ProfileActivityBlogList,
  ProfileActivitySwiperNav,
  profileBlogsPageHref,
} from "@/features/blog";
import type { CompactBlogPostsSwiperHandle } from "@/features/blog";
import {
  FollowersFollowingDialog,
  MediaFullViewDialog,
  ProfileSquadsCategoriesCard,
} from "@/features/profile";
import { ProfilePageSkeletonInner } from "@/components/skeletons";
import { HoverCard } from "@/components/ui/popover";
import { LinkPreviewCardContent } from "@/components/ui/popover";
import {
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from "@/components/icons/SocialProviderIcons";
import { shell } from "@/lib/styles";
import { RetroIconLink } from "@/components/ui/button";
import {
  formatJoinedDate,
  formatMonthYear,
  isPlaceholderProfileBio,
  markdownBioToHtml,
} from "@/lib/profile/profileDisplay";
import {
  buildOpenSourceList,
  buildProfileProjects,
} from "@/lib/profile/profilePortfolioData";
import { type ActivityTab } from "@/lib/profile/profilePageHelpers";
import { resolveProfileMediaUrl } from "@/lib/profile/resolveProfileMediaUrl";
import { useProfileAccordionSections } from "@/hooks/useProfileAccordionSections";
import { useProfileShareUrl } from "@/hooks/useProfileShareUrl";
export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isHydrated, shouldBlock } = useRequireAuth();
  const [activityTab, setActivityTab] = useState<ActivityTab>("posts");
  const activitySwiperRef = useRef<CompactBlogPostsSwiperHandle>(null);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [mySetupPreview, setMySetupPreview] = useState<{
    src: string;
    title: string;
  } | null>(null);
  const [followCounts, setFollowCounts] = useState({
    followersCount: 0,
    followingCount: 0,
  });
  const [readStreak, setReadStreak] = useState<ReadStreakPayload | null>(null);
  const [readHeatmapDays, setReadHeatmapDays] = useState<string[] | null>(null);
  const [achievementSummary, setAchievementSummary] = useState({
    unlocked: 0,
    total: 10,
  });
  const [achievementItems, setAchievementItems] = useState<
    AchievementProgressItemDto[]
  >([]);
  const [overviewMetrics, setOverviewMetrics] =
    useState<ProfileOverviewMetrics | null>(null);
  const [timeSeries, setTimeSeries] = useState<ProfileTimePoint[]>([]);
  const {
    openSectionId,
    accordionsRootRef,
    visibleCounts,
    sectionLoading,
    setSectionOpen,
    viewMore,
  } = useProfileAccordionSections("certification");
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
          setAchievementSummary({
            unlocked: data.unlockedCount,
            total: data.total,
          });
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
  const profileShareUrl = useProfileShareUrl(user?.username, "/profile");
  const weekChartData = useMemo(
    () =>
      timeSeries
        .slice(-7)
        .map((p) => ({ name: p.date.slice(5), views: p.views })),
    [timeSeries],
  );
  const monthChartData = useMemo(
    () => timeSeries.map((p) => ({ name: p.date.slice(5), views: p.views })),
    [timeSeries],
  );
  const showWeekChart = weekChartData.length >= 2;
  const showMonthChart = monthChartData.length >= 7;
  const showTotalChart = monthChartData.length >= 7;
  const joinedLabel = useMemo(() => {
    const str = formatJoinedDate(user?.createdAt);
    return str ? `Joined ${str}` : "";
  }, [user?.createdAt]);
  const profileProjects = useMemo(
    () => buildProfileProjects(user?.projects),
    [user?.projects],
  );
  const openSourceList = useMemo(
    () =>
      buildOpenSourceList(
        profileProjects,
        user?.openSourceContributions,
      ),
    [profileProjects, user?.openSourceContributions],
  );
  if (!isHydrated || shouldBlock) {
    return <ProfilePageSkeletonInner />;
  }
  const goToSettingsSection = (
    section: string,
    opts?: {
      editIndex?: number;
    },
  ) => {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("settingsTargetSection", section);
        if (opts?.editIndex != null) {
          window.sessionStorage.setItem(
            "settingsTargetEditIndex",
            String(opts.editIndex),
          );
        } else {
          window.sessionStorage.removeItem("settingsTargetEditIndex");
        }
      } catch {}
    }
    router.push("/settings");
  };
  return (
    <div className="min-h-screen w-full font-sans text-foreground ss-profile-readonly">
      <div className={shell.contentRail}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-8">
            <section className="border-4 border-border bg-card shadow overflow-hidden">
              <div className="h-48 relative border-b-4 border-border overflow-hidden">
                {user?.coverBanner ? (
                  <img
                    src={user.coverBanner}
                    alt={user.coverBannerAlt?.trim() || "Cover banner"}
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
                    src={resolveProfileMediaUrl(
                      user?.profileImg || user?.image,
                      user?.username,
                    )}
                    alt={user?.profileImgAlt?.trim() || "Profile photo"}
                    title={user?.profileImgAlt?.trim() || undefined}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <h1 className="text-4xl font-black uppercase tracking-tighter italic">
                        {user?.fullName || user?.name || "Profile"}
                      </h1>
                      <div className="text-primary font-bold flex items-center gap-2 mt-1  text-xs tracking-widest">
                        <span>{user?.username ? `@${user.username}` : ""}</span>
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
                                user.portfolioUrl.trim().startsWith("http")
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
                            <span className="size-1.5 bg-border" />{" "}
                            {joinedLabel}
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
                      dangerouslySetInnerHTML={{
                        __html: markdownBioToHtml(user.bio),
                      }}
                    />
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-sm text-muted-foreground italic mb-4">
                        No bio yet.
                      </p>
                      <Link
                        href="/settings"
                        className="px-4 py-2 border-2 border-primary text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        Add bio
                      </Link>
                    </div>
                  )}
                </div>

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
                    <span className="font-black text-sm uppercase">
                      {readStreak?.current ?? 0}
                    </span>
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
                  {user?.username ? (
                    <ProfileActivitySwiperNav swiperRef={activitySwiperRef} />
                  ) : null}
                </div>
              </div>
              <ProfileActivityTabs
                tabs={["posts", "replies", "repost"]}
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
              src={mySetupPreview?.src ?? ""}
              title={mySetupPreview?.title}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="space-y-4 border-4 border-border bg-card p-4 shadow">
                <ProfileSectionHeader
                  icon={Monitor}
                  title="Stack & Tools"
                  onAddClick={() => goToSettingsSection("stack-tools")}
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
                      onClick={() => goToSettingsSection("stack-tools")}
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
                  onAddClick={() => goToSettingsSection("my-setup")}
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
                          const hasProduct = Boolean(
                            (it.productUrl ?? "").trim(),
                          );
                          const setupImgLabel = it.imageAlt?.trim() || it.label;
                          return (
                            <div
                              key={`setup-${it.imageUrl}-${it.label}`}
                              className="snap-start shrink-0 w-[240px] border-2 border-border bg-muted/10 shadow overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setMySetupPreview({
                                    src: it.imageUrl,
                                    title: setupImgLabel,
                                  })
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
                                    <ExternalLink className="size-3.5" />{" "}
                                    Product
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
                      onClick={() => goToSettingsSection("my-setup")}
                      className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline"
                    >
                      <Plus className="size-3" /> Add
                    </button>
                  </div>
                )}
              </section>
            </div>

            <div ref={accordionsRootRef} className="space-y-6">
              <ProfilePortfolioAccordions
                mode="self"
                certifications={user?.certifications ?? []}
                projects={profileProjects.nonGithub}
                openSourceList={openSourceList}
                openSectionId={openSectionId}
                visibleCounts={visibleCounts}
                sectionLoading={sectionLoading}
                setSectionOpen={setSectionOpen}
                viewMore={viewMore}
                formatMonthYear={formatMonthYear}
                onAddCertification={() => goToSettingsSection("certifications")}
                onAddProject={() => goToSettingsSection("projects")}
                onAddOpenSource={() => goToSettingsSection("open-source")}
                onEditCertification={(i) =>
                  goToSettingsSection("certifications", { editIndex: i })
                }
                onEditProject={(i) =>
                  goToSettingsSection("projects", { editIndex: i })
                }
                openSourceEmptyMessage="Add contributions"
                openSourceEmptyActionLabel="Add contribution"
              />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
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
                    <p className="text-[10px] font-black uppercase">
                      Followers & Following
                    </p>
                    {followCounts.followersCount === 0 &&
                    followCounts.followingCount === 0 ? (
                      <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">
                        No followers yet
                      </p>
                    ) : (
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">
                        {followCounts.followersCount} followers ·{" "}
                        {followCounts.followingCount} following
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className="p-2 border-2 border-border bg-card shrink-0"
                  aria-hidden
                >
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

            <div className="border-4 border-border bg-card p-5 shadow space-y-4">
              <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <TestAccountLottie size={24} />
                Public Profile
              </h3>
              <ProfileShareUrlCopyRow url={profileShareUrl} />
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                {user?.linkedin && (
                  <RetroIconLink
                    href={
                      user.linkedin.startsWith("http")
                        ? user.linkedin
                        : `https://${user.linkedin}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                  >
                    <LinkedinIcon className="size-5 text-[#0A66C2]" />
                  </RetroIconLink>
                )}
                {user?.github && (
                  <RetroIconLink
                    href={
                      user.github.startsWith("http")
                        ? user.github
                        : `https://${user.github}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                  >
                    <GithubIcon className="size-5 text-[#24292f] dark:text-[#f0f6fc]" />
                  </RetroIconLink>
                )}
                {user?.instagram && (
                  <RetroIconLink
                    href={
                      user.instagram.startsWith("http")
                        ? user.instagram
                        : `https://${user.instagram}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="size-5 text-[#E4405F]" />
                  </RetroIconLink>
                )}
                {user?.youtube && (
                  <RetroIconLink
                    href={
                      user.youtube.startsWith("http")
                        ? user.youtube
                        : `https://${user.youtube}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                  >
                    <YoutubeIcon className="size-5 text-[#FF0000]" />
                  </RetroIconLink>
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
                        : "—"}
                    </p>
                  </div>
                  <div
                    className="flex-1 min-w-0 h-14 overflow-hidden flex items-center"
                    aria-label={
                      showWeekChart ? undefined : "No activity data yet"
                    }
                  >
                    {showWeekChart ? (
                      <AreaChart
                        data={weekChartData}
                        index="name"
                        categories={["views"]}
                        height={56}
                        sparkline
                      />
                    ) : (
                      <ProfileActivitySparklinePlaceholder />
                    )}
                  </div>
                </div>

                <div className="flex flex-row items-stretch min-h-0 p-3 border-2 border-border bg-muted/5 shadow">
                  <div className="flex flex-col justify-center shrink-0 pr-4 text-left">
                    <p className="text-lg font-black italic leading-none">
                      {overviewMetrics ? (overviewMetrics.views30Days ?? 0) : 0}
                    </p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">
                      Views this month
                    </p>
                    <p className="text-[9px] font-black mt-0.5 text-primary">
                      {overviewMetrics
                        ? `${overviewMetrics.repeatVisitors7Days ?? 0} repeat`
                        : "—"}
                    </p>
                  </div>
                  <div
                    className="flex-1 min-w-0 h-14 overflow-hidden flex items-center"
                    aria-label={
                      showMonthChart ? undefined : "No activity data yet"
                    }
                  >
                    {showMonthChart ? (
                      <AreaChart
                        data={monthChartData}
                        index="name"
                        categories={["views"]}
                        height={56}
                        sparkline
                      />
                    ) : (
                      <ProfileActivitySparklinePlaceholder />
                    )}
                  </div>
                </div>

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
                    aria-label={
                      showTotalChart ? undefined : "No activity data yet"
                    }
                  >
                    {showTotalChart ? (
                      <AreaChart
                        data={monthChartData}
                        index="name"
                        categories={["views"]}
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

            <div className="border-4 border-border bg-card p-5 shadow space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" /> Performance
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                  <div className="text-lg font-black italic flex items-center gap-2">
                    {readStreak?.longest ?? 0}{" "}
                    <StreakFireLottie play size={28} />
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

              <div className="space-y-3 pt-2">
                <p className="text-[9px] font-black uppercase text-muted-foreground">
                  Activity Summary
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 border-2 border-border bg-card text-center shadow">
                    <p className="text-sm font-black italic">0</p>
                    <p className="text-[7px] font-bold uppercase text-muted-foreground">
                      Posts
                    </p>
                  </div>
                  <div className="p-2 border-2 border-border bg-card text-center shadow">
                    <p className="text-sm font-black italic">0</p>
                    <p className="text-[7px] font-bold uppercase text-muted-foreground">
                      Reposts
                    </p>
                  </div>
                  <div className="p-2 border-2 border-border bg-card text-center shadow">
                    <p className="text-sm font-black italic">0</p>
                    <p className="text-[7px] font-bold uppercase text-muted-foreground">
                      Respect
                    </p>
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
              <RecentAchievementsPreview
                items={achievementItems}
                className="mt-4"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
