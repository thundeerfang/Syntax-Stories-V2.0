"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, UserPlus, Compass } from "lucide-react";
import {
  DialogSearchEmptyState,
  SearchableTabbedFormDialog,
} from "@/components/ui/dialog";
import { FollowToggleButton } from "@/components/ui/button/FollowToggleButton";
import { followApi, type FollowUser } from "@/api/follow";
import { resolveProfileMediaUrl } from "@/lib/profile/resolveProfileMediaUrl";
import { toast } from "sonner";
type Tab = "followers" | "following";
export interface FollowersFollowingDialogProps {
  open: boolean;
  onClose: () => void;
  username: string | null;
  currentUserUsername?: string | null;
  token: string | null;
  followersCount?: number;
  followingCount?: number;
  onFollowChange?: () => void;
}
function FollowersFollowingEmptyState({
  tab,
  hasSearch,
}: Readonly<{
  tab: Tab;
  hasSearch: boolean;
}>) {
  if (hasSearch) {
    return <DialogSearchEmptyState />;
  }
  if (tab === "followers") {
    return (
      <>
        <div className="mb-4 flex size-16 items-center justify-center border-2 border-dashed border-muted-foreground/30 bg-muted/20">
          <UserPlus className="size-8 text-muted-foreground/50" />
        </div>
        <p className="text-[10px] font-black uppercase">No followers yet</p>
        <p className="mt-1.5 max-w-[220px] text-[9px] font-bold text-muted-foreground">
          Share your profile — your audience is waiting
        </p>
      </>
    );
  }
  return (
    <>
      <div className="mb-4 flex size-16 items-center justify-center border-2 border-dashed border-muted-foreground/30 bg-muted/20">
        <Compass className="size-8 text-muted-foreground/50" />
      </div>
      <p className="text-[10px] font-black uppercase">
        Not following anyone yet
      </p>
      <p className="mt-1.5 max-w-[220px] text-[9px] font-bold text-muted-foreground">
        Discover builders and hit Follow
      </p>
    </>
  );
}
function showFollowActionsForUser(
  token: string | null,
  profileUsername: string | null,
  rowUsername: string,
  currentUserUsername: string | null | undefined,
): boolean {
  if (!token || rowUsername === profileUsername) return false;
  const me = currentUserUsername?.toLowerCase() ?? "";
  return me === "" || rowUsername.toLowerCase() !== me;
}
function FollowListRow({
  user,
  profileUsername,
  currentUserUsername,
  token,
  actionUsername,
  onClose,
  iFollowUsernames,
  onFollow,
  onUnfollow,
}: Readonly<{
  user: FollowUser;
  profileUsername: string | null;
  currentUserUsername?: string | null;
  token: string | null;
  actionUsername: string | null;
  onClose: () => void;
  iFollowUsernames: Set<string>;
  onFollow: (u: string) => void;
  onUnfollow: (u: string) => void;
}>) {
  const showActions = showFollowActionsForUser(
    token,
    profileUsername,
    user.username,
    currentUserUsername,
  );
  const isFollowing = iFollowUsernames.has(user.username);
  return (
    <div className="flex items-center gap-3 border-2 border-border bg-muted/5 p-3 transition-colors hover:bg-muted/20">
      <Link
        href={`/u/${user.username}`}
        onClick={onClose}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <img
          src={resolveProfileMediaUrl(user.profileImg, user.username)}
          alt=""
          className="size-10 shrink-0 border-2 border-border object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-black uppercase">
            {user.fullName || user.username}
          </p>
          <p className="truncate text-[9px] font-bold uppercase text-muted-foreground">
            @{user.username}
          </p>
        </div>
      </Link>
      {showActions ? (
        <FollowToggleButton
          isFollowing={isFollowing}
          disabled={actionUsername === user.username}
          onClick={() =>
            isFollowing
              ? void onUnfollow(user.username)
              : void onFollow(user.username)
          }
        />
      ) : null}
    </div>
  );
}
export function FollowersFollowingDialog({
  open,
  onClose,
  username,
  currentUserUsername,
  token,
  followersCount = 0,
  followingCount = 0,
  onFollowChange,
}: Readonly<FollowersFollowingDialogProps>) {
  const [tab, setTab] = useState<Tab>("followers");
  const [search, setSearch] = useState("");
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followersNextCursor, setFollowersNextCursor] = useState<string | null>(
    null,
  );
  const [followingNextCursor, setFollowingNextCursor] = useState<string | null>(
    null,
  );
  const [iFollowUsernames, setIFollowUsernames] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionUsername, setActionUsername] = useState<string | null>(null);
  useEffect(() => {
    if (!open || !username) return;
    setLoading(true);
    setFollowersNextCursor(null);
    setFollowingNextCursor(null);
    const promises: [
      Promise<{
        success: boolean;
        list: FollowUser[];
        nextCursor: string | null;
      }>,
      Promise<{
        success: boolean;
        list: FollowUser[];
        nextCursor: string | null;
      }>,
    ] = [followApi.getFollowers(username), followApi.getFollowing(username)];
    Promise.all(promises)
      .then(([r1, r2]) => {
        if (r1.success) {
          setFollowers(r1.list);
          setFollowersNextCursor(r1.nextCursor ?? null);
        }
        if (r2.success) {
          setFollowing(r2.list);
          setFollowingNextCursor(r2.nextCursor ?? null);
        }
      })
      .catch(() => {
        toast.error("Failed to load list");
      })
      .finally(() => setLoading(false));
  }, [open, username]);
  useEffect(() => {
    if (!open || !token || !currentUserUsername) return;
    followApi
      .getFollowing(currentUserUsername)
      .then((res) => {
        if (res.success)
          setIFollowUsernames(new Set(res.list.map((u) => u.username)));
      })
      .catch(() => {});
  }, [open, token, currentUserUsername]);
  const nextCursor =
    tab === "followers" ? followersNextCursor : followingNextCursor;
  const loadMore = () => {
    if (!username || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    const api =
      tab === "followers"
        ? followApi.getFollowers(username, nextCursor)
        : followApi.getFollowing(username, nextCursor);
    api
      .then((res) => {
        if (res.success) {
          if (tab === "followers") {
            setFollowers((prev) => [...prev, ...res.list]);
            setFollowersNextCursor(res.nextCursor ?? null);
          } else {
            setFollowing((prev) => [...prev, ...res.list]);
            setFollowingNextCursor(res.nextCursor ?? null);
          }
        }
      })
      .catch(() => toast.error("Failed to load more"))
      .finally(() => setLoadingMore(false));
  };
  const list = tab === "followers" ? followers : following;
  const filtered = search.trim()
    ? list.filter(
        (u) =>
          (u.fullName ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (u.username ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : list;
  const handleFollow = async (targetUsername: string) => {
    if (!token) return;
    setActionUsername(targetUsername);
    try {
      await followApi.follow(targetUsername, token);
      setIFollowUsernames((prev) => new Set(prev).add(targetUsername));
      toast.success("Following");
      onFollowChange?.();
      if (username) {
        const res = await followApi.getFollowing(username);
        if (res.success) {
          setFollowing(res.list);
          setFollowingNextCursor(res.nextCursor ?? null);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to follow");
    } finally {
      setActionUsername(null);
    }
  };
  const handleUnfollow = async (targetUsername: string) => {
    if (!token) return;
    setActionUsername(targetUsername);
    try {
      await followApi.unfollow(targetUsername, token);
      setIFollowUsernames((prev) => {
        const next = new Set(prev);
        next.delete(targetUsername);
        return next;
      });
      setFollowing((prev) => prev.filter((u) => u.username !== targetUsername));
      toast.success("Unfollowed");
      onFollowChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to unfollow");
    } finally {
      setActionUsername(null);
    }
  };
  const hasSearch = search.trim().length > 0;
  let listSection: React.ReactNode;
  if (loading) {
    listSection = (
      <p className="py-8 text-center text-[10px] font-bold uppercase text-muted-foreground">
        Loading...
      </p>
    );
  } else if (filtered.length === 0) {
    listSection = (
      <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
        <FollowersFollowingEmptyState tab={tab} hasSearch={hasSearch} />
      </div>
    );
  } else {
    let loadMoreLabel = "Load more";
    if (loadingMore) {
      loadMoreLabel = "Loading…";
    }
    listSection = (
      <>
        {filtered.map((user) => (
          <FollowListRow
            key={user.id}
            user={user}
            profileUsername={username}
            currentUserUsername={currentUserUsername}
            token={token}
            actionUsername={actionUsername}
            onClose={onClose}
            iFollowUsernames={iFollowUsernames}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
          />
        ))}
        {!search.trim() && nextCursor && (
          <div className="pt-2">
            <button
              type="button"
              disabled={loadingMore}
              onClick={loadMore}
              className="w-full border-2 border-border bg-muted/30 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-muted/50 disabled:opacity-50"
            >
              {loadMoreLabel}
            </button>
          </div>
        )}
      </>
    );
  }
  return (
    <SearchableTabbedFormDialog
      open={open}
      onClose={onClose}
      titleId="followers-dialog-title"
      title="Followers & Following"
      titleIcon={<Users className="size-5" strokeWidth={2.5} aria-hidden />}
      subtitle="People who follow this profile and accounts they follow."
      tabs={[
        { id: "followers", label: `Followers ${followersCount}` },
        { id: "following", label: `Following ${followingCount}` },
      ]}
      activeTab={tab}
      onTabChange={setTab}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={
        tab === "followers" ? "Search followers..." : "Search following..."
      }
    >
      {listSection}
    </SearchableTabbedFormDialog>
  );
}
