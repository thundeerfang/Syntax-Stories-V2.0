'use client';

import React, { useEffect, useState } from 'react';
import { followApi, type PublicProfileUser } from '@/api/follow';

const profileCache = new Map<string, PublicProfileUser>();

export function MentionPopoverCard({
  username,
  initialFullName,
  initialProfileImg,
}: Readonly<{
  username: string;
  initialFullName?: string;
  initialProfileImg?: string;
}>) {
  const [user, setUser] = useState<PublicProfileUser | null>(() => profileCache.get(username) ?? null);
  const [loading, setLoading] = useState(() => !profileCache.has(username));

  useEffect(() => {
    if (!username.trim()) return;
    const cached = profileCache.get(username);
    if (cached) {
      setUser(cached);
      setLoading(false);
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

  return (
    <div className="w-[260px] bg-card">
      <div className="relative">
        <div className="relative z-0 h-20 overflow-hidden border-b-2 border-border bg-muted">
          {loading && !user ? (
            <div className="h-full w-full animate-pulse bg-muted" />
          ) : display.coverBanner ? (
            <img src={display.coverBanner} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full gradient-auto" />
          )}
        </div>
        <div className="absolute left-3 top-full z-10 -translate-y-1/2">
          {loading && !user ? (
            <div className="h-11 w-11 animate-pulse border-2 border-border bg-card shadow-[3px_3px_0_0_var(--border)]" />
          ) : (
            <img
              src={avatarSrc}
              alt=""
              className="h-11 w-11 border-2 border-border bg-card object-cover shadow-[3px_3px_0_0_var(--border)]"
            />
          )}
        </div>
      </div>
      <div className="px-3 pb-2.5 pt-7">
        <p className="line-clamp-2 text-left text-[11px] font-black uppercase leading-tight tracking-tight text-foreground">
          {loading && !user ? '…' : display.fullName || username}
        </p>
        <p className="mt-0.5 text-left font-mono text-[10px] text-primary">@{username}</p>
      </div>
    </div>
  );
}
