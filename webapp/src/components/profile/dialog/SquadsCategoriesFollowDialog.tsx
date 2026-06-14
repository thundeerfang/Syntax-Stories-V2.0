"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, Layers, UsersRound } from "lucide-react";
import {
  DialogSearchEmptyState,
  SearchableTabbedFormDialog,
} from "@/components/ui/dialog";
import { FollowToggleButton } from "@/components/ui/button/FollowToggleButton";
import { squadsApi, type SquadSummary } from "@/api/squads";
import { resolveSquadIconUrl } from "@/lib/squads/squadMedia";
import { CategoryFollowButton } from "@/components/topics/CategoryFollowButton";
import { FOLLOWED_CATEGORIES_CHANGED_EVENT } from "@/lib/feeds/followedCategoriesStorage";
import type { FollowedCategoryRow } from "@/hooks/useProfileSquadsAndCategories";
import { toast } from "sonner";
type Tab = "squads" | "categories";
export type SquadsCategoriesFollowDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  squads: SquadSummary[];
  categories: FollowedCategoryRow[];
  showCategories: boolean;
  isSelf?: boolean;
  token?: string | null;
  loadingSquads?: boolean;
  loadingCategories?: boolean;
  userId?: string | null;
  onCategoriesChange?: () => void;
  onSquadsChange?: () => void;
}>;
function EmptySquads({
  hasSearch,
}: Readonly<{
  hasSearch: boolean;
}>) {
  if (hasSearch) {
    return <DialogSearchEmptyState />;
  }
  return (
    <>
      <div className="mb-4 flex size-16 items-center justify-center border-2 border-dashed border-muted-foreground/30 bg-muted/20">
        <UsersRound className="size-8 text-muted-foreground/50" />
      </div>
      <p className="text-[10px] font-black uppercase">No squads yet</p>
      <p className="mt-1.5 max-w-[220px] text-[9px] font-bold text-muted-foreground">
        Join a squad from Explore or create your own
      </p>
    </>
  );
}
function EmptyCategories({
  hasSearch,
}: Readonly<{
  hasSearch: boolean;
}>) {
  if (hasSearch) {
    return <DialogSearchEmptyState />;
  }
  return (
    <>
      <div className="mb-4 flex size-16 items-center justify-center border-2 border-dashed border-muted-foreground/30 bg-muted/20">
        <Layers className="size-8 text-muted-foreground/50" />
      </div>
      <p className="text-[10px] font-black uppercase">No categories followed</p>
      <p className="mt-1.5 max-w-[220px] text-[9px] font-bold text-muted-foreground">
        Follow categories on the Topics page to see them here
      </p>
    </>
  );
}
export function SquadsCategoriesFollowDialog({
  open,
  onClose,
  squads,
  categories,
  showCategories,
  isSelf = false,
  token = null,
  loadingSquads = false,
  loadingCategories = false,
  userId = null,
  onCategoriesChange,
  onSquadsChange,
}: SquadsCategoriesFollowDialogProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("squads");
  const [search, setSearch] = useState("");
  const [leavingSlug, setLeavingSlug] = useState<string | null>(null);
  const [localSquads, setLocalSquads] = useState<SquadSummary[]>(squads);
  const [localCategories, setLocalCategories] =
    useState<FollowedCategoryRow[]>(categories);
  useEffect(() => {
    if (open) setLocalSquads(squads);
  }, [open, squads]);
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);
  useEffect(() => {
    if (!open || !showCategories) return;
    const onChanged = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          userId: string | null;
        }>
      ).detail;
      if (
        detail?.userId != null &&
        userId != null &&
        detail.userId !== userId.trim()
      )
        return;
      onCategoriesChange?.();
    };
    window.addEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onChanged);
    return () =>
      window.removeEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onChanged);
  }, [open, showCategories, userId, onCategoriesChange]);
  const activeTab = showCategories ? tab : "squads";
  const loading = activeTab === "squads" ? loadingSquads : loadingCategories;
  const filteredSquads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return localSquads;
    return localSquads.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q),
    );
  }, [localSquads, search]);
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return localCategories;
    return localCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }, [localCategories, search]);
  const followedCount = localCategories.length;
  const hasSearch = search.trim().length > 0;
  const handleLeaveSquad = async (slug: string, name: string) => {
    if (!token) return;
    setLeavingSlug(slug);
    try {
      await squadsApi.leave(slug, token);
      setLocalSquads((prev) => prev.filter((s) => s.slug !== slug));
      toast.success(`Left ${name}`);
      onSquadsChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not leave squad");
    } finally {
      setLeavingSlug(null);
    }
  };
  let listSection: React.ReactNode;
  if (loading) {
    listSection = (
      <p className="py-8 text-center text-[10px] font-bold uppercase text-muted-foreground">
        Loading...
      </p>
    );
  } else if (activeTab === "squads") {
    if (filteredSquads.length === 0) {
      listSection = (
        <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
          <EmptySquads hasSearch={hasSearch} />
        </div>
      );
    } else {
      listSection = filteredSquads.map((s) => {
        const iconSrc = resolveSquadIconUrl(s.iconUrl, s.slug);
        const squadHref = `/squads/${encodeURIComponent(s.slug)}`;
        return (
          <div
            key={s._id}
            className="flex items-center gap-3 border-2 border-border bg-muted/5 p-3 transition-colors hover:bg-muted/20"
          >
            <Link
              href={squadHref}
              onClick={onClose}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <img
                src={iconSrc}
                alt=""
                className="size-10 shrink-0 border-2 border-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-black uppercase">
                  {s.name}
                </p>
                <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">
                  s/{s.slug}
                  {s.visibility === "private" ? " · private" : ""}
                  {s.viewerRole ? ` · ${s.viewerRole}` : ""}
                </p>
              </div>
            </Link>
            {isSelf && token ? (
              <FollowToggleButton
                isFollowing
                unfollowLabel="Leave"
                disabled={leavingSlug === s.slug}
                onClick={() => void handleLeaveSquad(s.slug, s.name)}
              />
            ) : (
              <FollowToggleButton
                isFollowing={false}
                followLabel="Open"
                onClick={() => {
                  onClose();
                  router.push(squadHref);
                }}
              />
            )}
          </div>
        );
      });
    }
  } else if (filteredCategories.length === 0) {
    listSection = (
      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
        <EmptyCategories hasSearch={hasSearch} />
      </div>
    );
  } else {
    listSection = filteredCategories.map((c) => (
      <div
        key={c.slug}
        className="flex items-center gap-3 border-2 border-border bg-muted/5 p-3 transition-colors hover:bg-muted/20"
      >
        <Link
          href={`/topics/category/${encodeURIComponent(c.slug)}`}
          onClick={onClose}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-primary/10">
            <FolderKanban className="size-5 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-black uppercase">
              {c.name}
            </p>
            <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">
              {c.postCount} {c.postCount === 1 ? "post" : "posts"}
            </p>
          </div>
        </Link>
        <CategoryFollowButton
          slug={c.slug}
          name={c.name}
          onToggle={(nowFollowing) => {
            if (!nowFollowing) {
              setLocalCategories((prev) =>
                prev.filter((row) => row.slug !== c.slug),
              );
            }
            onCategoriesChange?.();
          }}
        />
      </div>
    ));
  }
  const dialogTitle = showCategories ? "Squads & Categories" : "Squads";
  const dialogSubtitle = showCategories
    ? "Squads you belong to and categories you follow."
    : "Public squads this profile has joined.";
  return (
    <SearchableTabbedFormDialog
      open={open}
      onClose={onClose}
      titleId="squads-categories-dialog-title"
      title={dialogTitle}
      titleIcon={
        <UsersRound className="size-5" strokeWidth={2.5} aria-hidden />
      }
      subtitle={dialogSubtitle}
      tabs={
        showCategories
          ? [
              { id: "squads", label: `Squads ${localSquads.length}` },
              { id: "categories", label: `Categories ${followedCount}` },
            ]
          : undefined
      }
      activeTab={activeTab}
      onTabChange={setTab}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={
        activeTab === "squads" ? "Search squads..." : "Search categories..."
      }
    >
      {listSection}
    </SearchableTabbedFormDialog>
  );
}
