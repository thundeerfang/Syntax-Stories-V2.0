"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, NotebookPen, Trash2 } from "lucide-react";
import { FollowingPostsGridSkeleton } from "@/components/skeletons";
import { toast } from "sonner";
import { followApi, type PublicProfileUser } from "@/api/follow";
import { blogApi, type BlogPostResponse } from "@/api/blog";
import { BlogCard, type BlogCardOwnerActions } from "@/features/blog";
import { ConfirmDialog } from "@/components/ui/dialog";
import {
  RailCountPill,
  RailCountPillLoading,
  RailCountPillPair,
  RailFeedEmptyState,
  RailSectionSubheader,
  RectangleAppBreadcrumb,
} from "@/components/layout";
import {
  ProfileBlogsStatusTabs,
  type ProfileBlogsStatusTab,
} from "./ProfileBlogsStatusTabs";
import { BlockShadowButton } from "@/components/ui/button";
import { mapBlogPostResponseToPost } from "@/lib/blog/mapBlogPostResponseToPost";
import { mapPublicFeedPostToPost } from "@/lib/blog/mapFeedPostToPost";
import {
  BLOG_FEED_GRID_CLASS,
  BLOG_FEED_GRID_ITEM_CLASS,
} from "@/lib/blog/blogFeedGrid";
import { shell } from "@/lib/styles";
import { setWriteEditorSessionPostId } from "@/lib/blog/writeBlogSession";
import { formatJoinedDate } from "@/lib/profile/profileDisplay";
import { summaryToPlainText } from "@/lib/blog/summaryPlain";
import { cn } from "@/lib/core/utils";
import { useAuthStore } from "@/store/auth";
import type { BlogTaxonomyRow } from "@/types/blog";
import type { Post } from "@/types";
import { BLOG_TRASH_RETENTION_MS } from "@/variable";
import { resolveProfileMediaUrl } from "@/lib/profile/resolveProfileMediaUrl";
type BlogStatusTab = ProfileBlogsStatusTab;
function formatBlogDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}
function trashExpiresLabel(deletedAt?: string): string {
  if (!deletedAt) return "";
  const end = new Date(deletedAt).getTime() + BLOG_TRASH_RETENTION_MS;
  const left = end - Date.now();
  if (left <= 0) return "Expired from trash — refresh the list.";
  const days = Math.ceil(left / (24 * 60 * 60 * 1000));
  return days <= 1 ? "Purges within 1 day" : `Purges in ~${days} days`;
}
function filterByCategory<
  T extends {
    category?: string;
  },
>(items: T[], categorySlug: string): T[] {
  if (!categorySlug) return items;
  return items.filter(
    (p) => (p.category ?? "").toLowerCase() === categorySlug.toLowerCase(),
  );
}
function filterBySearch<T>(
  items: T[],
  query: string,
  haystack: (item: T) => string,
): T[] {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter((item) => haystack(item).toLowerCase().includes(q));
}
function ProfileBlogsPageIntro({
  profile,
  isOwner,
  profileLoading,
}: Readonly<{
  profile: PublicProfileUser | null;
  isOwner: boolean;
  profileLoading: boolean;
}>) {
  const username = profile?.username ?? "";
  const displayName = profile?.fullName?.trim() || username;
  const bioPlain = profile?.bio?.trim() ? summaryToPlainText(profile.bio) : "";
  const joinedLabel = formatJoinedDate(profile?.createdAt);
  return (
    <header className="space-y-4">
      <RectangleAppBreadcrumb
        items={[
          { href: "/", label: "Home" },
          { href: `/u/${encodeURIComponent(username)}`, label: `@${username}` },
          { label: "Posts" },
        ]}
      />
      <div className="flex flex-col gap-4 border-4 border-border bg-card p-4 shadow sm:flex-row sm:items-start sm:gap-6 sm:p-5">
        <div className="size-20 shrink-0 border-4 border-border bg-muted shadow sm:size-24">
          {profileLoading ? (
            <div className="size-full animate-pulse bg-muted" aria-hidden />
          ) : profile ? (
            <img
              src={resolveProfileMediaUrl(profile.profileImg, profile.username)}
              alt={`${displayName} profile`}
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full bg-muted" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {profileLoading ? (
            <div className="space-y-2 animate-pulse" aria-hidden>
              <div className="h-7 w-48 bg-muted" />
              <div className="h-3 w-32 bg-muted" />
              <div className="h-12 w-full max-w-lg bg-muted/70" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-2xl font-black uppercase tracking-tighter text-foreground sm:text-3xl">
                    {displayName}
                  </h1>
                  <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                    @{username}
                    {joinedLabel ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · Joined {joinedLabel}
                      </span>
                    ) : null}
                  </p>
                </div>
                {isOwner ? (
                  <BlockShadowButton
                    href="/blogs/write"
                    variant="primary"
                    size="md"
                    shadow="sm"
                    className="shrink-0"
                    onClick={() => setWriteEditorSessionPostId(null)}
                  >
                    <NotebookPen className="size-3.5" /> Write
                  </BlockShadowButton>
                ) : null}
              </div>
              {bioPlain ? (
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground line-clamp-4">
                  {bioPlain}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No bio yet.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
function ProfileBlogGridItem({
  post,
  ownerActions,
}: Readonly<{
  post: Post;
  ownerActions?: BlogCardOwnerActions;
}>) {
  const showSocialActions = !ownerActions || ownerActions.mode === "published";
  return (
    <li className={BLOG_FEED_GRID_ITEM_CLASS}>
      <BlogCard
        post={post}
        ownerActions={ownerActions}
        showSocialActions={showSocialActions}
        className="h-full w-full min-w-0"
      />
    </li>
  );
}
export function UserProfileBlogsContent({
  username,
}: Readonly<{
  username: string;
}>) {
  const router = useRouter();
  const { user: currentUser, token } = useAuthStore();
  const normalizedUsername = username.trim().toLowerCase();
  const ownerUsername = currentUser?.username?.trim().toLowerCase() ?? "";
  const isOwner =
    Boolean(token) &&
    ownerUsername.length > 0 &&
    ownerUsername === normalizedUsername;
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<BlogStatusTab>("published");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [categories, setCategories] = useState<BlogTaxonomyRow[]>([]);
  const [published, setPublished] = useState<BlogPostResponse[]>([]);
  const [publishedPublic, setPublishedPublic] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<BlogPostResponse[]>([]);
  const [deleted, setDeleted] = useState<BlogPostResponse[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<BlogPostResponse | null>(
    null,
  );
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<BlogPostResponse | null>(null);
  const [purgeSubmitting, setPurgeSubmitting] = useState(false);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<BlogPostResponse | null>(null);
  const [profile, setProfile] = useState<PublicProfileUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const author = useMemo(
    () => ({
      username: normalizedUsername,
      displayName:
        profile?.fullName?.trim() ||
        currentUser?.fullName ||
        normalizedUsername,
      profileImg:
        profile?.profileImg || (isOwner ? currentUser?.profileImg : undefined),
    }),
    [
      normalizedUsername,
      isOwner,
      profile,
      currentUser?.fullName,
      currentUser?.profileImg,
    ],
  );
  useEffect(() => {
    if (!normalizedUsername) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    void followApi
      .getPublicProfile(normalizedUsername)
      .then((res) => {
        if (!cancelled && res.success) setProfile(res.user);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [normalizedUsername]);
  const load = useCallback(async () => {
    if (!normalizedUsername) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const tax = await blogApi.getTaxonomy();
      setCategories(tax.categories ?? []);
      if (isOwner && token) {
        const [pub, dr, del] = await Promise.all([
          blogApi.listMyPosts(token, "published"),
          blogApi.listMyPosts(token, "draft"),
          blogApi.listMyPosts(token, "deleted"),
        ]);
        setPublished((pub.posts ?? []).filter((p) => p.status === "published"));
        setDrafts(dr.posts ?? []);
        setDeleted(del.posts ?? []);
        setPublishedPublic([]);
      } else {
        const { posts: raw } = await blogApi.getUserPublishedPosts(
          normalizedUsername,
          120,
          token,
        );
        setPublishedPublic(raw.map(mapPublicFeedPostToPost));
        setPublished([]);
        setDrafts([]);
        setDeleted([]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load posts");
      setPublished([]);
      setPublishedPublic([]);
      setDrafts([]);
      setDeleted([]);
    } finally {
      setLoading(false);
    }
  }, [isOwner, normalizedUsername, token]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const t = window.setTimeout(
      () => setSearchDebounced(searchInput.trim().toLowerCase()),
      280,
    );
    return () => window.clearTimeout(t);
  }, [searchInput]);
  const confirmDelete = useCallback(
    async (p: BlogPostResponse) => {
      if (!token) return;
      setDeleteSubmitting(true);
      try {
        await blogApi.deletePost(p._id, token);
        toast.success("Post moved to trash");
        setDeleteTarget(null);
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed");
      } finally {
        setDeleteSubmitting(false);
      }
    },
    [token, load],
  );
  const confirmPurge = useCallback(
    async (p: BlogPostResponse) => {
      if (!token) return;
      setPurgeSubmitting(true);
      try {
        await blogApi.purgePostPermanent(p._id, token);
        toast.success("Post permanently deleted");
        setPurgeTarget(null);
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Permanent delete failed");
      } finally {
        setPurgeSubmitting(false);
      }
    },
    [token, load],
  );
  const restore = useCallback(
    async (p: BlogPostResponse) => {
      if (!token) return;
      setRestoreId(p._id);
      try {
        const { post: restored } = await blogApi.restorePost(p._id, token);
        toast.success("Restored as published", {
          description:
            restored.slug !== p.slug
              ? `New URL slug: ${restored.slug}`
              : undefined,
        });
        await load();
        setTab("published");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Restore failed");
      } finally {
        setRestoreId(null);
      }
    },
    [token, load],
  );
  const goToEditor = useCallback(
    (p: BlogPostResponse) => {
      setWriteEditorSessionPostId(p._id);
      setEditTarget(null);
      router.push("/blogs/write");
    },
    [router],
  );
  const publicHref = (slug: string) =>
    `/blogs/${encodeURIComponent(normalizedUsername)}/${encodeURIComponent(slug)}`;
  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All categories" },
      ...categories.map((c) => ({ value: c.slug, label: c.name })),
    ],
    [categories],
  );
  const filteredPublished = useMemo(
    () => filterByCategory(published, categoryFilter),
    [published, categoryFilter],
  );
  const filteredDrafts = useMemo(
    () => filterByCategory(drafts, categoryFilter),
    [drafts, categoryFilter],
  );
  const filteredDeleted = useMemo(
    () => filterByCategory(deleted, categoryFilter),
    [deleted, categoryFilter],
  );
  const filteredPublic = useMemo(() => {
    if (!categoryFilter) return publishedPublic;
    return publishedPublic.filter(
      (p) => (p.category ?? "").toLowerCase() === categoryFilter.toLowerCase(),
    );
  }, [publishedPublic, categoryFilter]);
  const blogPostHaystack = useCallback(
    (p: BlogPostResponse) => `${p.title} ${p.summary ?? ""}`,
    [],
  );
  const publicPostHaystack = useCallback(
    (p: Post) => `${p.title} ${p.excerpt ?? ""}`,
    [],
  );
  const displayedPublished = useMemo(
    () => filterBySearch(filteredPublished, searchDebounced, blogPostHaystack),
    [filteredPublished, searchDebounced, blogPostHaystack],
  );
  const displayedDrafts = useMemo(
    () => filterBySearch(filteredDrafts, searchDebounced, blogPostHaystack),
    [filteredDrafts, searchDebounced, blogPostHaystack],
  );
  const displayedDeleted = useMemo(
    () => filterBySearch(filteredDeleted, searchDebounced, blogPostHaystack),
    [filteredDeleted, searchDebounced, blogPostHaystack],
  );
  const displayedPublic = useMemo(
    () => filterBySearch(filteredPublic, searchDebounced, publicPostHaystack),
    [filteredPublic, searchDebounced, publicPostHaystack],
  );
  const tabCategoryTotal = useMemo(() => {
    if (tab === "drafts") return filteredDrafts.length;
    if (tab === "deleted") return filteredDeleted.length;
    if (isOwner) return filteredPublished.length;
    return filteredPublic.length;
  }, [
    tab,
    filteredDrafts,
    filteredDeleted,
    filteredPublished,
    filteredPublic,
    isOwner,
  ]);
  const tabDisplayedTotal = useMemo(() => {
    if (tab === "drafts") return displayedDrafts.length;
    if (tab === "deleted") return displayedDeleted.length;
    if (isOwner) return displayedPublished.length;
    return displayedPublic.length;
  }, [
    tab,
    displayedDrafts,
    displayedDeleted,
    displayedPublished,
    displayedPublic,
    isOwner,
  ]);
  const countAriaLabel = useMemo(() => {
    const noun =
      tab === "drafts"
        ? "drafts"
        : tab === "deleted"
          ? "deleted posts"
          : "published posts";
    if (searchDebounced) {
      return `${tabDisplayedTotal} matching ${noun} of ${tabCategoryTotal} total`;
    }
    return `${tabCategoryTotal} ${noun}`;
  }, [tab, tabDisplayedTotal, tabCategoryTotal, searchDebounced]);
  const renderOwnerPublished = () => {
    if (displayedPublished.length === 0) {
      return (
        <RailFeedEmptyState
          icon={FileText}
          title="No published posts"
          description={
            searchDebounced || categoryFilter
              ? "Try another search or clear your filters."
              : "Publish from the write workspace."
          }
          actions={[
            {
              label: "Write",
              href: "/blogs/write",
              variant: "primary",
              icon: (
                <NotebookPen
                  className="size-4 shrink-0"
                  strokeWidth={2.5}
                  aria-hidden
                />
              ),
            },
          ]}
        />
      );
    }
    return (
      <ul className={BLOG_FEED_GRID_CLASS}>
        {displayedPublished.map((p) => (
          <ProfileBlogGridItem
            key={p._id}
            post={mapBlogPostResponseToPost(p, author)}
            ownerActions={{
              mode: "published",
              viewHref: publicHref(p.slug),
              onEdit: () => setEditTarget(p),
              onDelete: () => setDeleteTarget(p),
            }}
          />
        ))}
      </ul>
    );
  };
  const renderPublicPublished = () => {
    if (displayedPublic.length === 0) {
      return (
        <RailFeedEmptyState
          icon={FileText}
          title="No published posts"
          description={
            searchDebounced || categoryFilter
              ? "Try another search or clear your filters."
              : "This author has not published yet."
          }
        />
      );
    }
    return (
      <ul className={BLOG_FEED_GRID_CLASS}>
        {displayedPublic.map((p) => (
          <ProfileBlogGridItem key={p.id} post={p} />
        ))}
      </ul>
    );
  };
  const renderDrafts = () => {
    if (displayedDrafts.length === 0) {
      return (
        <RailFeedEmptyState
          icon={NotebookPen}
          title="No drafts"
          description={
            searchDebounced || categoryFilter
              ? "Try another search or clear your filters."
              : "Autosave keeps drafts while you write."
          }
          actions={[
            {
              label: "Write",
              href: "/blogs/write",
              variant: "primary",
              icon: (
                <NotebookPen
                  className="size-4 shrink-0"
                  strokeWidth={2.5}
                  aria-hidden
                />
              ),
            },
          ]}
        />
      );
    }
    return (
      <ul className={BLOG_FEED_GRID_CLASS}>
        {displayedDrafts.map((p) => (
          <ProfileBlogGridItem
            key={p._id}
            post={mapBlogPostResponseToPost(p, author)}
            ownerActions={{
              mode: "draft",
              onEdit: () => setEditTarget(p),
              onDelete: () => setDeleteTarget(p),
            }}
          />
        ))}
      </ul>
    );
  };
  const renderDeleted = () => {
    if (displayedDeleted.length === 0) {
      return (
        <RailFeedEmptyState
          icon={Trash2}
          title="Trash is empty"
          description={
            searchDebounced || categoryFilter
              ? "Try another search or clear your filters."
              : "Deleted posts stay here for 7 days before they expire from restore."
          }
        />
      );
    }
    return (
      <ul className={BLOG_FEED_GRID_CLASS}>
        {displayedDeleted.map((p) => {
          const post = mapBlogPostResponseToPost(
            { ...p, status: "draft", updatedAt: p.deletedAt ?? p.updatedAt },
            author,
          );
          return (
            <ProfileBlogGridItem
              key={p._id}
              post={post}
              ownerActions={{
                mode: "deleted",
                restoreBusy: restoreId === p._id,
                deletedMeta: `Deleted ${p.deletedAt ? formatBlogDate(p.deletedAt) : "—"} · ${trashExpiresLabel(p.deletedAt)}`,
                onRestore: () => void restore(p),
                onPurge: () => setPurgeTarget(p),
              }}
            />
          );
        })}
      </ul>
    );
  };
  let listBody: React.ReactNode;
  if (loading) {
    listBody = (
      <section aria-busy="true" aria-label="Loading posts">
        <FollowingPostsGridSkeleton count={6} />
      </section>
    );
  } else if (tab === "drafts" && isOwner) {
    listBody = renderDrafts();
  } else if (tab === "deleted" && isOwner) {
    listBody = renderDeleted();
  } else if (isOwner) {
    listBody = renderOwnerPublished();
  } else {
    listBody = renderPublicPublished();
  }
  return (
    <div className={cn(shell.contentRail, "flex min-h-0 flex-1 flex-col")}>
      <div className="flex min-h-0 w-full flex-1 flex-col space-y-6 md:space-y-8">
        <ProfileBlogsPageIntro
          profile={profile}
          isOwner={isOwner}
          profileLoading={profileLoading}
        />

        <RailSectionSubheader
          leading={
            <>
              <ProfileBlogsStatusTabs
                tab={tab}
                onTabChange={setTab}
                isOwner={isOwner}
                showRepostsLink={Boolean(token)}
              />
              <div className="shrink-0">
                {loading ? (
                  <RailCountPillLoading />
                ) : searchDebounced ? (
                  <RailCountPillPair
                    primary={tabDisplayedTotal}
                    secondary={tabCategoryTotal}
                    primaryLabel={`${tabDisplayedTotal} matching`}
                    secondaryLabel={`${tabCategoryTotal} total`}
                  />
                ) : (
                  <RailCountPill
                    count={tabCategoryTotal}
                    aria-label={countAriaLabel}
                  />
                )}
              </div>
            </>
          }
          search={{
            value: searchInput,
            onChange: setSearchInput,
            placeholder: "Search posts",
            ariaLabel: "Search posts",
            disabled: loading,
          }}
          filter={{
            id: "user-blogs-category",
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: categoryOptions,
            placeholder: "Category",
            widthClass: "w-[10.5rem] sm:w-[11.5rem]",
          }}
        />

        <section aria-label="Blog posts" className="min-w-0">
          {listBody}
        </section>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleteSubmitting) setDeleteTarget(null);
        }}
        titleId="blog-post-delete-dialog-title"
        title="Move to trash?"
        variant="danger"
        message="This post will leave the site immediately. You can restore it from the Deleted tab for up to 7 days."
        confirmLabel="Move to trash"
        closeOnConfirm={false}
        loading={deleteSubmitting}
        onConfirm={() => {
          if (deleteTarget) void confirmDelete(deleteTarget);
        }}
      />
      <ConfirmDialog
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Open editor?"
        variant="warning"
        message="Continue to the write workspace to edit this post."
        confirmLabel="Continue"
        defaultFocusConfirm
        onConfirm={() => {
          if (editTarget) goToEditor(editTarget);
        }}
      />
      <ConfirmDialog
        open={purgeTarget !== null}
        onClose={() => {
          if (!purgeSubmitting) setPurgeTarget(null);
        }}
        titleId="blog-post-purge-dialog-title"
        title="Delete forever?"
        variant="danger"
        message="This permanently removes the post and cannot be undone. Only use this for items already in trash."
        confirmLabel="Delete forever"
        closeOnConfirm={false}
        loading={purgeSubmitting}
        onConfirm={() => {
          if (purgeTarget) void confirmPurge(purgeTarget);
        }}
      />
    </div>
  );
}
