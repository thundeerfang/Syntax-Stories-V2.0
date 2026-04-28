'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, UserPlus } from 'lucide-react';
import { followApi, type PublicProfileUser } from '@/api/follow';
import { SparkLottie } from '@/components/ui/SparkLottie';
import { StreakFireLottie } from '@/components/ui/StreakFireLottie';

const profileCache = new Map<string, PublicProfileUser>();

export function MentionPopoverCard({
  username,
  initialFullName,
  initialProfileImg,
  profileHref,
}: Readonly<{
  username: string;
  initialFullName?: string;
  initialProfileImg?: string;
  /** When set, the card is a single clickable surface (e.g. public blog originator hover). */
  profileHref?: string;
}>) {
  const [user, setUser] = useState<PublicProfileUser | null>(() => profileCache.get(username) ?? null);
  const [loading, setLoading] = useState(() => !profileCache.has(username));
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);

  useEffect(() => {
    if (!username.trim()) return;
    const cached = profileCache.get(username);
    if (cached) {
      setUser(cached);
      setLoading(false);
      void followApi.getFollowCounts(username).then((res) => {
        if (res.success) {
          setFollowersCount(res.followersCount);
          setFollowingCount(res.followingCount);
        }
      });
      return;
    }
    let cancelled = false;
    setLoading(true);
    followApi
      .getPublicProfile(username)
      .then((res) => {
        if (cancelled || !res.success || !res.user) return;
        profileCache.set(username, res.user);
        setUser(res.user);
        setFollowersCount(res.followersCount ?? 0);
        setFollowingCount(res.followingCount ?? 0);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  const display: PublicProfileUser = user ?? {
    id: '',
    username,
    fullName: initialFullName?.trim() || username,
    profileImg: initialProfileImg?.trim() || undefined,
    coverBanner: undefined,
  };

  const avatarSrc =
    display.profileImg?.trim() ||
    (username ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}` : '');

  let coverBannerEl: React.ReactNode;
  if (loading && !user) {
    coverBannerEl = <div className="h-full w-full animate-pulse bg-muted" />;
  } else if (display.coverBanner) {
    coverBannerEl = <img src={display.coverBanner} alt="" className="h-full w-full object-cover" />;
  } else {
    coverBannerEl = <div className="h-full w-full gradient-auto" />;
  }

  const inner = (
    <>
      <div className="relative">
        <div className="relative z-0 h-20 overflow-hidden border-b-2 border-border bg-muted">
          {coverBannerEl}
        </div>
        <div className="absolute left-3 top-full z-10 -translate-y-1/2">
          {loading && !user ? (
            <div className="flex h-[52px] w-[52px] items-center justify-center border-2 border-border bg-card shadow-[3px_3px_0_0_var(--border)]">
              <div className="h-11 w-11 animate-pulse border border-border/80 bg-muted" />
            </div>
          ) : (
            <div className="flex h-[52px] w-[52px] items-center justify-center border-2 border-border bg-card shadow-[3px_3px_0_0_var(--border)]">
              <img
                src={avatarSrc}
                alt=""
                className="object-cover"
              />
            </div>
          )}
        </div>
      </div>
      <div className="px-3 pb-2.5 pt-7">
        <p className="line-clamp-2 text-left text-[11px] font-black uppercase leading-tight tracking-tight text-foreground">
          {loading && !user ? '…' : display.fullName || username}
        </p>
        <p className="mt-0.5 text-left font-mono text-[10px] text-primary">@{username}</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-border/60 pt-2">
          <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-foreground" title="Respect">
            <SparkLottie play size={14} />
            <span>10</span>
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-foreground" title="Streak">
            <StreakFireLottie play size={14} />
            <span>0</span>
          </span>
          {followersCount != null && (
            <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-foreground" title="Followers">
              <Users className="size-3.5 shrink-0 text-primary" aria-hidden />
              {followersCount}
            </span>
          )}
          {followingCount != null && (
            <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-foreground" title="Following">
              <UserPlus className="size-3.5 shrink-0 text-primary" aria-hidden />
              {followingCount}
            </span>
          )}
        </div>
      </div>
    </>
  );

  if (profileHref) {
    return (
      <Link
        href={profileHref}
        className="block w-[260px] border-2 border-border bg-card shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {inner}
      </Link>
    );
  }

  return <div className="w-[260px] border-2 border-border bg-card shadow-sm">{inner}</div>;
}
