'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderKanban, Layers, Search, UsersRound } from 'lucide-react';
import { FormDialog } from '@/components/ui/dialog';
import { FollowToggleButton } from '@/components/ui/button/FollowToggleButton';
import { cn } from '@/lib/core/utils';
import { squadsApi, type SquadSummary } from '@/api/squads';
import { resolveSquadMediaUrl } from '@/features/squads/components/SquadDiscoverCard';
import { CategoryFollowButton } from '@/features/topics/components/CategoryFollowButton';
import { FOLLOWED_CATEGORIES_CHANGED_EVENT } from '@/lib/feeds/followedCategoriesStorage';
import type { FollowedCategoryRow } from '@/features/profile/hooks/useProfileSquadsAndCategories';
import { toast } from 'sonner';


type Tab = 'squads' | 'categories';

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

function EmptySquads({ hasSearch }: Readonly<{ hasSearch: boolean }>) {
  if (hasSearch) {
    return (
      <>
        <Search className="size-12 text-muted-foreground/60 mb-3" />
        <p className="text-[10px] font-black uppercase text-muted-foreground">No matches</p>
      </>
    );
  }
  return (
    <>
      <div className="size-16 border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center mb-4">
        <UsersRound className="size-8 text-muted-foreground/50" />
      </div>
      <p className="text-[10px] font-black uppercase">No squads yet</p>
      <p className="text-[9px] font-bold text-muted-foreground mt-1.5 max-w-[220px]">
        Join a squad from Explore or create your own
      </p>
    </>
  );
}

function EmptyCategories({ hasSearch }: Readonly<{ hasSearch: boolean }>) {
  if (hasSearch) {
    return (
      <>
        <Search className="size-12 text-muted-foreground/60 mb-3" />
        <p className="text-[10px] font-black uppercase text-muted-foreground">No matches</p>
      </>
    );
  }
  return (
    <>
      <div className="size-16 border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center mb-4">
        <Layers className="size-8 text-muted-foreground/50" />
      </div>
      <p className="text-[10px] font-black uppercase">No categories followed</p>
      <p className="text-[9px] font-bold text-muted-foreground mt-1.5 max-w-[220px]">
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
  const [tab, setTab] = useState<Tab>('squads');
  const [search, setSearch] = useState('');
  const [leavingSlug, setLeavingSlug] = useState<string | null>(null);
  const [localSquads, setLocalSquads] = useState<SquadSummary[]>(squads);
  const [localCategories, setLocalCategories] = useState<FollowedCategoryRow[]>(categories);

  useEffect(() => {
    if (open) setLocalSquads(squads);
  }, [open, squads]);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    if (!open || !showCategories) return;
    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ userId: string | null }>).detail;
      if (detail?.userId != null && userId != null && detail.userId !== userId.trim()) return;
      onCategoriesChange?.();
    };
    window.addEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onChanged);
  }, [open, showCategories, userId, onCategoriesChange]);

  const activeTab = showCategories ? tab : 'squads';
  const loading = activeTab === 'squads' ? loadingSquads : loadingCategories;

  const filteredSquads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return localSquads;
    return localSquads.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q),
    );
  }, [localSquads, search]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return localCategories;
    return localCategories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
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
      toast.error(e instanceof Error ? e.message : 'Could not leave squad');
    } finally {
      setLeavingSlug(null);
    }
  };

  let listSection: React.ReactNode;
  if (loading) {
    listSection = (
      <p className="text-[10px] font-bold text-muted-foreground uppercase text-center py-8">Loading...</p>
    );
  } else if (activeTab === 'squads') {
    if (filteredSquads.length === 0) {
      listSection = (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <EmptySquads hasSearch={hasSearch} />
        </div>
      );
    } else {
      listSection = filteredSquads.map((s) => {
        const iconSrc =
          resolveSquadMediaUrl(s.iconUrl) ??
          `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(s.slug)}`;
        const squadHref = `/squads/${encodeURIComponent(s.slug)}`;
        return (
          <div
            key={s._id}
            className="flex items-center gap-3 p-3 border-2 border-border bg-muted/5 hover:bg-muted/20 transition-colors"
          >
            <Link href={squadHref} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
              <img src={iconSrc} alt="" className="size-10 border-2 border-border shrink-0 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase truncate">{s.name}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase truncate">
                  s/{s.slug}
                  {s.visibility === 'private' ? ' · private' : ''}
                  {s.viewerRole ? ` · ${s.viewerRole}` : ''}
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
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <EmptyCategories hasSearch={hasSearch} />
      </div>
    );
  } else {
    listSection = filteredCategories.map((c) => (
      <div
        key={c.slug}
        className="flex items-center gap-3 p-3 border-2 border-border bg-muted/5 hover:bg-muted/20 transition-colors"
      >
        <Link
          href={`/topics/category/${encodeURIComponent(c.slug)}`}
          onClick={onClose}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="size-10 border-2 border-border bg-primary/10 flex items-center justify-center shrink-0">
            <FolderKanban className="size-5 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase truncate">{c.name}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase truncate">
              {c.postCount} {c.postCount === 1 ? 'post' : 'posts'}
            </p>
          </div>
        </Link>
        <CategoryFollowButton
          slug={c.slug}
          name={c.name}
          onToggle={(nowFollowing) => {
            if (!nowFollowing) {
              setLocalCategories((prev) => prev.filter((row) => row.slug !== c.slug));
            }
            onCategoriesChange?.();
          }}
        />
      </div>
    ));
  }

  const dialogTitle = showCategories ? 'Squads & Categories' : 'Squads';
  const dialogSubtitle = showCategories
    ? 'Squads you belong to and categories you follow.'
    : 'Public squads this profile has joined.';

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titleId="squads-categories-dialog-title"
      title={dialogTitle}
      titleIcon={<UsersRound className="size-5" strokeWidth={2.5} aria-hidden />}
      subtitle={dialogSubtitle}
      panelClassName="max-w-lg"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
    >
      {showCategories ? (
        <div className="flex shrink-0 border-b-2 border-border px-6">
          <button
            type="button"
            onClick={() => setTab('squads')}
            className={cn(
              'flex-1 py-3 font-black text-[10px] uppercase tracking-widest border-b-2 -mb-0.5 transition-colors',
              activeTab === 'squads'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            Squads {localSquads.length}
          </button>
          <button
            type="button"
            onClick={() => setTab('categories')}
            className={cn(
              'flex-1 py-3 font-black text-[10px] uppercase tracking-widest border-b-2 -mb-0.5 transition-colors',
              activeTab === 'categories'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            Categories {followedCount}
          </button>
        </div>
      ) : null}

      <div className="shrink-0 border-b-2 border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={activeTab === 'squads' ? 'Search squads...' : 'Search categories...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border-2 border-border bg-muted/30 text-[10px] font-bold uppercase tracking-widest placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-2">{listSection}</div>
    </FormDialog>
  );
}
