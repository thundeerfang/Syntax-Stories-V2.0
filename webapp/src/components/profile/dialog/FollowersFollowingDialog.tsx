'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Search, UserPlus, Compass } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';
import { followApi, type FollowUser } from '@/api/follow';
import { toast } from 'sonner';

type Tab = 'followers' | 'following';

export interface FollowersFollowingDialogProps {
  open: boolean;
  onClose: () => void;
  username: string | null;
  /** Logged-in user's username; used to know who *you* follow so we show Unfollow vs Follow correctly in both tabs */
  currentUserUsername?: string | null;
  token: string | null;
  followersCount?: number;
  followingCount?: number;
  onFollowChange?: () => void;
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
}: FollowersFollowingDialogProps) {
  const [tab, setTab] = useState<Tab>('followers');
  const [search, setSearch] = useState('');
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followersNextCursor, setFollowersNextCursor] = useState<string | null>(null);
  const [followingNextCursor, setFollowingNextCursor] = useState<string | null>(null);
  /** Usernames that the *current user* follows — so we show Unfollow vs Follow correctly in both tabs */
  const [iFollowUsernames, setIFollowUsernames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionUsername, setActionUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !username) return;
    setLoading(true);
    setFollowersNextCursor(null);
    setFollowingNextCursor(null);
    const promises: [Promise<{ success: boolean; list: FollowUser[]; nextCursor: string | null }>, Promise<{ success: boolean; list: FollowUser[]; nextCursor: string | null }>] = [
      followApi.getFollowers(username),
      followApi.getFollowing(username),
    ];
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
        toast.error('Failed to load list');
      })
      .finally(() => setLoading(false));
  }, [open, username]);

  // Load who *current user* follows so we show Unfollow vs Follow correctly (e.g. in Followers tab)
  useEffect(() => {
    if (!open || !token || !currentUserUsername) return;
    followApi.getFollowing(currentUserUsername)
      .then((res) => {
        if (res.success) setIFollowUsernames(new Set(res.list.map((u) => u.username)));
      })
      .catch(() => {});
  }, [open, token, currentUserUsername]);

  const nextCursor = tab === 'followers' ? followersNextCursor : followingNextCursor;

  const loadMore = () => {
    if (!username || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    const api = tab === 'followers' ? followApi.getFollowers(username, nextCursor) : followApi.getFollowing(username, nextCursor);
    api
      .then((res) => {
        if (res.success) {
          if (tab === 'followers') {
            setFollowers((prev) => [...prev, ...res.list]);
            setFollowersNextCursor(res.nextCursor ?? null);
          } else {
            setFollowing((prev) => [...prev, ...res.list]);
            setFollowingNextCursor(res.nextCursor ?? null);
          }
        }
      })
      .catch(() => toast.error('Failed to load more'))
      .finally(() => setLoadingMore(false));
  };

  const list = tab === 'followers' ? followers : following;
  const filtered = search.trim()
    ? list.filter(
        (u) =>
          (u.fullName ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (u.username ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : list;

  const handleFollow = async (targetUsername: string) => {
    if (!token) return;
    setActionUsername(targetUsername);
    try {
      await followApi.follow(targetUsername, token);
      setIFollowUsernames((prev) => new Set(prev).add(targetUsername));
      toast.success('Following');
      onFollowChange?.();
      if (username) {
        const res = await followApi.getFollowing(username);
        if (res.success) {
          setFollowing(res.list);
          setFollowingNextCursor(res.nextCursor ?? null);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to follow');
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
      toast.success('Unfollowed');
      onFollowChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to unfollow');
    } finally {
      setActionUsername(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="followers-dialog-title"
      contentClassName="relative p-0 pt-10 flex flex-col flex-1 min-h-0"
    >
      <h2 id="followers-dialog-title" className="text-sm font-black uppercase tracking-widest flex items-center gap-2 px-6 mb-4">
        <Users className="size-4 text-primary" /> Followers & Following
      </h2>
      <div className="flex border-b-2 border-border px-6">
        <button
          type="button"
          onClick={() => setTab('followers')}
          className={cn(
            'flex-1 py-3 font-black text-[10px] uppercase tracking-widest border-b-2 -mb-0.5 transition-colors',
            tab === 'followers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Followers {followersCount}
        </button>
        <button
          type="button"
          onClick={() => setTab('following')}
          className={cn(
            'flex-1 py-3 font-black text-[10px] uppercase tracking-widest border-b-2 -mb-0.5 transition-colors',
            tab === 'following'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Following {followingCount}
        </button>
      </div>
      <div className="p-4 border-b-2 border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={tab === 'followers' ? 'Search followers...' : 'Search following...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border-2 border-border bg-muted/30 text-[10px] font-bold uppercase tracking-widest placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        {loading ? (
          <p className="text-[10px] font-bold text-muted-foreground uppercase text-center py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            {search.trim() ? (
              <>
                <Search className="size-12 text-muted-foreground/60 mb-3" />
                <p className="text-[10px] font-black uppercase text-muted-foreground">No matches</p>
                <p className="text-[9px] font-bold text-muted-foreground/80 mt-1">Try a different search.</p>
              </>
            ) : tab === 'followers' ? (
              <>
                <div className="size-16 rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center mb-4">
                  <UserPlus className="size-8 text-muted-foreground/50" />
                </div>
                <p className="text-[10px] font-black uppercase">No followers yet</p>
                <p className="text-[9px] font-bold text-muted-foreground mt-1.5 max-w-[220px]">
                  Share your profile — your audience is waiting
                </p>
              </>
            ) : (
              <>
                <div className="size-16 rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center mb-4">
                  <Compass className="size-8 text-muted-foreground/50" />
                </div>
                <p className="text-[10px] font-black uppercase">Not following anyone yet</p>
                <p className="text-[9px] font-bold text-muted-foreground mt-1.5 max-w-[220px]">
                  Discover builders and hit Follow
                </p>
              </>
            )}
          </div>
        ) : (
          <>
          {filtered.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 border-2 border-border bg-muted/5 hover:bg-muted/20 transition-colors"
            >
              <Link href={`/u/${user.username}`} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
                <img
                  src={user.profileImg || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                  alt=""
                  className="size-10 border-2 border-border shrink-0 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase truncate">{user.fullName || user.username}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase truncate">@{user.username}</p>
                </div>
              </Link>
              {token && user.username !== username && (currentUserUsername == null || user.username.toLowerCase() !== currentUserUsername.toLowerCase()) && (
                iFollowUsernames.has(user.username) ? (
                  <button
                    type="button"
                    disabled={actionUsername === user.username}
                    onClick={() => handleUnfollow(user.username)}
                    className="shrink-0 px-3 py-1.5 border-2 border-border text-[9px] font-black uppercase hover:bg-muted disabled:opacity-50"
                  >
                    {actionUsername === user.username ? '…' : 'Unfollow'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={actionUsername === user.username}
                    onClick={() => handleFollow(user.username)}
                    className="shrink-0 px-3 py-1.5 border-2 border-primary bg-primary text-primary-foreground text-[9px] font-black uppercase disabled:opacity-50"
                  >
                    {actionUsername === user.username ? '…' : 'Follow'}
                  </button>
                )
              )}
            </div>
          ))}
          {!search.trim() && nextCursor && (
            <div className="pt-2">
              <button
                type="button"
                disabled={loadingMore}
                onClick={loadMore}
                className="w-full py-2 border-2 border-border bg-muted/30 text-[10px] font-black uppercase tracking-widest hover:bg-muted/50 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </Dialog>
  );
}
