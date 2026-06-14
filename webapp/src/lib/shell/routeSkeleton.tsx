import type { ReactNode } from "react";
import {
  AnalyticsPageSkeletonInner,
  BlogPostPageSkeletonInner,
  BlogWritePageSkeletonInner,
  ContactPageSkeletonInner,
  ExplorePageSkeletonInner,
  FollowingPageContentSkeleton,
  HomePageSkeletonInner,
  ProfilePageSkeletonInner,
  SettingsPageSkeletonInner,
  TrendingPageSkeletonInner,
  InvitePageSkeletonInner,
  AchievementsPageSkeletonInner,
} from "@/components/skeletons";
import {
  SquadDetailPageSkeleton,
  SquadsPageContentSkeleton,
} from "@/components/skeletons/SquadsPageSkeleton";
export function pickRouteSkeleton(pathname: string): ReactNode {
  const path = pathname.split("?")[0] ?? "";
  if (path === "/following" || path === "/bookmarks" || path === "/reposts") {
    return <FollowingPageContentSkeleton showIntro />;
  }
  if (path === "/explore") {
    return <ExplorePageSkeletonInner />;
  }
  if (path === "/trending") {
    return <TrendingPageSkeletonInner />;
  }
  if (path === "/squads" || path === "/squads/featured") {
    return <SquadsPageContentSkeleton />;
  }
  if (path.startsWith("/squads/")) {
    return <SquadDetailPageSkeleton />;
  }
  if (path === "/topics" || path.startsWith("/topics/")) {
    return <FollowingPageContentSkeleton showIntro={false} />;
  }
  if (path === "/categories") {
    return <ExplorePageSkeletonInner />;
  }
  if (path === "/contact" || path.startsWith("/contact/")) {
    return <ContactPageSkeletonInner />;
  }
  if (path === "/settings" || path.startsWith("/settings/")) {
    return <SettingsPageSkeletonInner />;
  }
  if (path === "/invite" || path.startsWith("/invite/")) {
    return <InvitePageSkeletonInner />;
  }
  if (path === "/achievements") {
    return <AchievementsPageSkeletonInner />;
  }
  if (path.startsWith("/profile/analytics")) {
    return <AnalyticsPageSkeletonInner />;
  }
  if (path.startsWith("/profile")) {
    return <ProfilePageSkeletonInner />;
  }
  if (
    path.startsWith("/blogs/write") ||
    path === "/write" ||
    path.startsWith("/write?")
  ) {
    return <BlogWritePageSkeletonInner />;
  }
  if (path.startsWith("/blogs/")) {
    const segments = path.split("/").filter(Boolean);
    if (
      segments.length >= 3 &&
      segments[0] === "blogs" &&
      segments[1] !== "write"
    ) {
      return <BlogPostPageSkeletonInner />;
    }
  }
  if (path.startsWith("/u/")) {
    return <ProfilePageSkeletonInner variant="public" />;
  }
  if (
    path === "/" ||
    path === "/about" ||
    path === "/pricing" ||
    path === "/wallet" ||
    path === "/feedback"
  ) {
    return <HomePageSkeletonInner />;
  }
  return <HomePageSkeletonInner />;
}
