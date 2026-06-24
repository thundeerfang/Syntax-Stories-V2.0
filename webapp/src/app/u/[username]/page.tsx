"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Monitor,
  Users,
  Wrench,
  Activity,
  ChevronRight,
  Globe,
  ExternalLink,
} from "lucide-react";
import {
  followApi,
  type ReadStreakPayload,
  type PublicProfileUser,
} from "@/api/follow";
import { analyticsApi } from "@/api/analytics";
import { useAuthStore } from "@/store/auth";
import { useRouteRestoreNonce } from "@/hooks/useRouteRestore";
import {
  FollowersFollowingDialog,
  MediaFullViewDialog,
  ProfileSquadsCategoriesCard,
} from "@/features/profile";
import { toast } from "sonner";
import { StackToolsBadgeList } from "@/components/profile";
import {
  SparkLottie,
  StreakFireLottie,
  TestAccountLottie,
} from "@/components/ui";
import { AreaChart } from "@/components/retroui";
import { ProfileActivityTabs, ProfileHeatmap } from "@/features/profile";
import type { ActivityTab } from "@/lib/profile/profilePageHelpers";
import { HoverCard } from "@/components/ui/popover";
import { LinkPreviewCardContent } from "@/components/ui/popover";
import { shell } from "@/lib/styles";
import {
  BlockShadowButton,
  FollowToggleButton,
  RetroIconLink,
} from "@/components/ui/button";
import {
  ProfileActivityBlogList,
  ProfileActivitySwiperNav,
  profileBlogsPageHref,
} from "@/features/blog";
import type { CompactBlogPostsSwiperHandle } from "@/features/blog";
import { ProfilePageSkeletonInner } from "@/components/skeletons";
import {
  formatJoinedDate,
  isPlaceholderProfileBio,
  markdownBioToHtml,
} from "@/lib/profile/profileDisplay";
import { formatMonthYearShort } from "@/lib/profile/dateLabels";
import {
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from "@/components/icons/SocialProviderIcons";
import { resolveProfileMediaUrl } from "@/lib/profile/resolveProfileMediaUrl";
import {
  ProfilePortfolioAccordions,
  ProfileShareUrlCopyRow,
} from "@/components/profile";
import {
  buildOpenSourceList,
  buildProfileProjects,
} from "@/lib/profile/profilePortfolioData";
import { useProfileAccordionSections } from "@/hooks/useProfileAccordionSections";
import { useProfileShareUrl } from "@/hooks/useProfileShareUrl";

type PublicProfileFollowCtaProps = Readonly<{
  isSelf: boolean;
  token: string | null | undefined;
  username: string;
  paramsUsername: string | undefined;
  followLoading: boolean;
  following: boolean;
  onFollowClick: () => void;
}>;

function PublicProfileFollowCta({
  isSelf,
  token,
  username,
  paramsUsername,
  followLoading,
  following,
  onFollowClick,
}: PublicProfileFollowCtaProps) {
  if (isSelf) return null;
  const loginPath = `/u/${paramsUsername ?? username}`;
  const loginNext = encodeURIComponent(loginPath);
  const loginHref = `/login?next=${loginNext}`;
  if (!token) {
    return (
      <BlockShadowButton href={loginHref} variant="primary" size="sm">
        Follow
      </BlockShadowButton>
    );
  }
  return (
    <FollowToggleButton
      isFollowing={following}
      onClick={onFollowClick}
      disabled={followLoading}
      unfollowLabel="Following"
    />
  );
}

export default function PublicProfilePage() {
  // NOSONAR S3776 — large public profile view; split into section components incrementally
  const params = useParams();
  const router = useRouter();
  const username =
    typeof params?.username === "string"
      ? params.username.trim().toLowerCase()
      : "";
  const { user: currentUser, token } = useAuthStore();
  const [profile, setProfile] = useState<PublicProfileUser | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mySetupPreview, setMySetupPreview] = useState<{
    src: string;
    title: string;
  } | null>(null);
  const [activityTab, setActivityTab] = useState<ActivityTab>("posts");
  const activitySwiperRef = useRef<CompactBlogPostsSwiperHandle>(null);
  const [readStreak, setReadStreak] = useState<ReadStreakPayload | null>(null);
  const [readHeatmapDays, setReadHeatmapDays] = useState<string[] | null>(null);
  const routeRestoreNonce = useRouteRestoreNonce();

  useEffect(() => {
    if (!username) {
      setLoading(false);
      router.replace("/");
      return;
    }
    setLoading(true);
    setReadStreak(null);
    setReadHeatmapDays(null);
    followApi
      .getPublicProfile(username)
      .then((res) => {
        if (res.success) {
          setProfile(res.user);
          setFollowersCount(res.followersCount);
          setFollowingCount(res.followingCount);
          setReadStreak(res.readStreak ?? null);
          setReadHeatmapDays(res.readHeatmapDays ?? null);
        }
      })
      .catch(() => {
        toast.error("User not found");
        router.replace("/");
      })
      .finally(() => setLoading(false));
  }, [username, router, routeRestoreNonce]);

  useEffect(() => {
    if (!token || !username || !currentUser) return;
    followApi
      .checkFollowing(username, token)
      .then((res) => setFollowing(res.following));
  }, [token, username, currentUser]);

  // Record profile view (best-effort; backend ignores self + dedupes by anon cookie)
  useEffect(() => {
    if (!username || !profile) return;
    // Do not count when owner views their own public profile
    if (currentUser?.username?.toLowerCase() === username.toLowerCase()) return;
    void analyticsApi.recordProfileView(username);
  }, [username, profile, currentUser?.username]);

  const handleFollowClick = async () => {
    if (!token || !username) {
      router.push("/login");
      return;
    }
    if (currentUser?.username?.toLowerCase() === username) return;
    setFollowLoading(true);
    try {
      if (following) {
        await followApi.unfollow(username, token);
        setFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
        toast.success("Unfollowed");
      } else {
        await followApi.follow(username, token);
        setFollowing(true);
        setFollowersCount((c) => c + 1);
        toast.success("Following");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setFollowLoading(false);
    }
  };

  const refreshCounts = () => {
    if (!username) return;
    followApi
      .getFollowCounts(username)
      .then((res) => {
        if (res.success) {
          setFollowersCount(res.followersCount);
          setFollowingCount(res.followingCount);
        }
      })
      .catch(() => {});
  };

  const profileProjects = useMemo(
    () => buildProfileProjects(profile?.projects),
    [profile?.projects],
  );

  const openSourceList = useMemo(
    () =>
      buildOpenSourceList(profileProjects, profile?.openSourceContributions),
    [profileProjects, profile?.openSourceContributions],
  );

  const {
    openSectionId,
    accordionsRootRef,
    visibleCounts,
    sectionLoading,
    setSectionOpen,
    viewMore,
  } = useProfileAccordionSections("certification");

  const joinedLabel = useMemo(() => {
    const str = formatJoinedDate(profile?.createdAt);
    return str ? `Joined ${str}` : "";
  }, [profile?.createdAt]);

  const profileShareUrl = useProfileShareUrl(profile?.username);

  if (loading || !profile) {
    return <ProfilePageSkeletonInner variant="public" />;
  }

  const isSelf = currentUser?.username?.toLowerCase() === username;

  return (
    <div className="min-h-screen w-full font-sans text-foreground">
      <div className={shell.contentRail}>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-8">
            <section className="border-4 border-border bg-card shadow overflow-hidden">
              <div className="h-48 relative border-b-4 border-border overflow-hidden">
                {profile.coverBanner ? (
                  <img
                    src={profile.coverBanner}
                    alt={
                      (
                        profile as { coverBannerAlt?: string }
                      ).coverBannerAlt?.trim() || "Cover banner"
                    }
                    title={
                      (
                        profile as { coverBannerAlt?: string }
                      ).coverBannerAlt?.trim() || undefined
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full gradient-auto" />
                )}
              </div>

              <div className="px-6 pb-8 pt-24 md:pt-32 relative bg-card">
                <div className="absolute -top-14 left-6 size-28 md:size-36 border-4 border-border bg-muted shadow overflow-hidden">
                  <img
                    src={resolveProfileMediaUrl(profile.profileImg, profile.username)}
                    alt={
                      (
                        profile as { profileImgAlt?: string }
                      ).profileImgAlt?.trim() || "Profile photo"
                    }
                    title={
                      (
                        profile as { profileImgAlt?: string }
                      ).profileImgAlt?.trim() || undefined
                    }
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <h1 className="text-4xl font-black uppercase tracking-tighter italic">
                        {profile.fullName || profile.username}
                      </h1>
                      <div className="text-primary font-bold flex items-center gap-2 mt-1 text-xs tracking-widest">
                        <span>@{profile.username}</span>
                        {profile?.portfolioUrl?.trim() ? (
                          <HoverCard
                            content={
                              <LinkPreviewCardContent
                                domain={profile.portfolioUrl}
                                title="Portfolio"
                              />
                            }
                            side="top"
                            align="start"
                            contentClassName="w-[280px] p-0"
                          >
                            <RetroIconLink
                              href={
                                profile.portfolioUrl.trim().startsWith("http")
                                  ? profile.portfolioUrl.trim()
                                  : `https://${profile.portfolioUrl.trim()}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              aria-label="Open portfolio"
                              size="sm"
                              className="size-7"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="size-4 text-primary" />
                            </RetroIconLink>
                          </HoverCard>
                        ) : null}
                        {joinedLabel ? (
                          <>
                            <span className="size-1.5 bg-border" />{" "}
                            {joinedLabel}
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-3 md:pt-1">
                      <PublicProfileFollowCta
                        isSelf={isSelf}
                        token={token}
                        username={username}
                        paramsUsername={
                          typeof params?.username === "string"
                            ? params.username
                            : undefined
                        }
                        followLoading={followLoading}
                        following={following}
                        onFollowClick={handleFollowClick}
                      />
                    </div>
                  </div>

                  {profile.bio?.trim() &&
                  !isPlaceholderProfileBio(profile.bio) ? (
                    <div
                      className="text-sm text-foreground/80 font-medium leading-relaxed max-w-none [&_strong]:text-primary [&_strong]:font-black [&_u]:decoration-primary/50 [&_em]:italic [&_em]:text-foreground"
                      dangerouslySetInnerHTML={{
                        __html: markdownBioToHtml(profile.bio),
                      }}
                    />
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-sm text-muted-foreground italic mb-4">
                        No bio yet.
                      </p>
                      {isSelf ? (
                        <BlockShadowButton
                          href="/settings"
                          variant="outline"
                          size="sm"
                        >
                          Add bio
                        </BlockShadowButton>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Stats bar — matches /profile */}
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
                      {followersCount}
                    </span>
                    <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">
                      Followers
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <span className="font-black text-sm uppercase">
                      {followingCount}
                    </span>
                    <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">
                      Following
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ACTIVITY (public) */}
            <section className="space-y-4 border-4 border-border bg-card shadow p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <Activity className="size-4 text-primary" /> Activity
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <BlockShadowButton
                    href={profileBlogsPageHref(username)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    View all
                  </BlockShadowButton>
                  <ProfileActivitySwiperNav swiperRef={activitySwiperRef} />
                </div>
              </div>
              <ProfileActivityTabs
                tabs={["posts", "replies", "repost"]}
                value={activityTab}
                onChange={setActivityTab}
              />
              <ProfileActivityBlogList
                key={activityTab}
                ref={activitySwiperRef}
                username={username}
                kind={activityTab}
                accessToken={token}
              />
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="space-y-4 border-4 border-border bg-card p-4 shadow">
                <div className="flex items-center justify-between px-2 mb-4">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                    <Monitor className="size-4 text-primary" /> Stack & Tools
                  </h2>
                </div>
                {profile.stackAndTools?.length ? (
                  <StackToolsBadgeList
                    names={profile.stackAndTools}
                    displayItems={profile.stackAndToolsDisplay}
                  />
                ) : (
                  <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      No stack yet
                    </p>
                  </div>
                )}
              </section>

              <section className="space-y-4 border-4 border-border bg-card p-4 shadow">
                <div className="flex items-center justify-between px-2 mb-4">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                    <Wrench className="size-4 text-primary" /> My Setup
                  </h2>
                </div>
                {(profile as any)?.mySetup?.length ? (
                  <div className="flex gap-3 overflow-x-auto ss-scrollbar-hide py-1 pr-1 snap-x">
                    {(
                      (profile as any).mySetup as Array<{
                        label: string;
                        imageUrl: string;
                        productUrl?: string;
                        imageAlt?: string;
                      }>
                    )
                      .slice(0, 5)
                      .map((it) => {
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
                              {it.productUrl ? (
                                <HoverCard
                                  content={
                                    <LinkPreviewCardContent
                                      domain={it.productUrl}
                                      title={it.label}
                                    />
                                  }
                                  side="top"
                                  align="start"
                                  contentClassName="w-[280px] p-0"
                                >
                                  <a
                                    href={it.productUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-[10px] font-black uppercase text-primary hover:underline"
                                  >
                                    <ExternalLink className="size-3.5" />{" "}
                                    Product
                                  </a>
                                </HoverCard>
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
                ) : (
                  <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      No setup yet
                    </p>
                  </div>
                )}
              </section>
            </div>

            <div ref={accordionsRootRef} className="space-y-6">
              <ProfilePortfolioAccordions
                mode="public"
                certifications={(profile.certifications as unknown[]) ?? []}
                projects={profileProjects.nonGithub}
                openSourceList={openSourceList}
                openSectionId={openSectionId}
                visibleCounts={visibleCounts}
                sectionLoading={sectionLoading}
                setSectionOpen={setSectionOpen}
                viewMore={viewMore}
                formatMonthYear={(val) => formatMonthYearShort(val ?? "")}
                openSourceEmptyMessage="No open source"
                footerVariant="retro"
              />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
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
                    {followersCount === 0 && followingCount === 0 ? (
                      <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">
                        No followers yet
                      </p>
                    ) : (
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">
                        {followersCount} followers · {followingCount} following
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
              username={username}
              userId={
                isSelf
                  ? (currentUser?.id ?? currentUser?._id ?? profile?.id ?? null)
                  : null
              }
              token={token}
              isSelf={!!isSelf}
            />

            {/* Public profile URL + social — same card as /profile */}
            <div className="border-4 border-border bg-card p-5 shadow space-y-4">
              <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <TestAccountLottie size={24} />
                Public Profile
              </h3>
              <ProfileShareUrlCopyRow url={profileShareUrl} variant="blockShadow" />
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                {profile.linkedin && (
                  <RetroIconLink
                    href={
                      profile.linkedin.startsWith("http")
                        ? profile.linkedin
                        : `https://${profile.linkedin}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                  >
                    <LinkedinIcon className="size-5 text-[#0A66C2]" />
                  </RetroIconLink>
                )}
                {profile.github && (
                  <RetroIconLink
                    href={
                      profile.github.startsWith("http")
                        ? profile.github
                        : `https://${profile.github}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                  >
                    <GithubIcon className="size-5 text-[#24292f] dark:text-[#f0f6fc]" />
                  </RetroIconLink>
                )}
                {profile.instagram && (
                  <RetroIconLink
                    href={
                      profile.instagram.startsWith("http")
                        ? profile.instagram
                        : `https://${profile.instagram}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="size-5 text-[#E4405F]" />
                  </RetroIconLink>
                )}
                {profile.youtube && (
                  <RetroIconLink
                    href={
                      profile.youtube.startsWith("http")
                        ? profile.youtube
                        : `https://${profile.youtube}`
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

            {/* ACHIEVEMENTS */}
            <div className="border-4 border-border bg-card p-5 shadow">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <SparkLottie play size={18} /> Achievements
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black italic">0/0</span>
                <span className="text-[9px] font-black text-muted-foreground uppercase">
                  Coming soon
                </span>
              </div>
              <div className="h-2 bg-muted border-2 border-border mt-3">
                <div className="h-full bg-primary" style={{ width: "0%" }} />
              </div>
            </div>

            {/* PERFORMANCE-LIKE CARD (public) moved to end */}
            <div className="border-4 border-border bg-card p-5 shadow space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Monitor className="size-4 text-primary" /> Creator Telemetry
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
                  <p className="text-lg font-black italic">0</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">
                    Total posts
                  </p>
                </div>
                <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                  <p className="text-lg font-black italic">0</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">
                    Total views
                  </p>
                </div>
                <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                  <p className="text-lg font-black italic">0</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">
                    Reposted posts
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-row items-stretch min-h-0 p-3 border-2 border-border bg-muted/5 shadow">
                  <div className="flex flex-col justify-center shrink-0 pr-4 text-left">
                    <p className="text-lg font-black italic leading-none">0</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">
                      Views this week
                    </p>
                  </div>
                  <div className="flex-1 min-w-0 h-14 overflow-hidden flex items-center">
                    <AreaChart
                      data={[
                        { name: "M", views: 0 },
                        { name: "T", views: 0 },
                        { name: "W", views: 0 },
                        { name: "T", views: 0 },
                        { name: "F", views: 0 },
                        { name: "S", views: 0 },
                        { name: "S", views: 0 },
                      ]}
                      index="name"
                      categories={["views"]}
                      height={56}
                      sparkline
                    />
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
          </div>

          <FollowersFollowingDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            username={username}
            currentUserUsername={currentUser?.username ?? null}
            token={token}
            followersCount={followersCount}
            followingCount={followingCount}
            onFollowChange={refreshCounts}
          />
          <MediaFullViewDialog
            open={!!mySetupPreview}
            onClose={() => setMySetupPreview(null)}
            src={mySetupPreview?.src ?? ""}
            title={mySetupPreview?.title}
          />
        </div>
      </div>
    </div>
  );
}
