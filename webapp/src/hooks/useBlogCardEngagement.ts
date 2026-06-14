"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { blogApi } from "@/api/blog";
import { useAuthDialogStore } from "@/store/authDialog";
import { useAuthStore } from "@/store/auth";
import { triggerRespectLightning } from "@/store/engagementEffects";
import { handleAchievementsResponse } from "@/lib/achievements/handleAchievementsResponse";
import type { Post } from "@/types";
export type BlogCardEngagementBusy = "respect" | "repost" | "bookmark" | null;
export type BlogCardEngagementState = Readonly<{
  respecting: boolean;
  respectCount: number;
  reposting: boolean;
  repostCount: number;
  bookmarked: boolean;
  bookmarkCount: number;
  busy: BlogCardEngagementBusy;
  squadShareOpen: boolean;
  setSquadShareOpen: (open: boolean) => void;
  toggleRespect: (source?: Element) => Promise<void>;
  toggleRepost: () => Promise<void>;
  toggleBookmark: () => Promise<void>;
  sharePost: () => void;
  openSquadShare: () => void;
}>;
export function useBlogCardEngagement(post: Post): BlogCardEngagementState {
  const username = post.author.username ?? post.author.id;
  const slug = post.slug;
  const token = useAuthStore((s) => s.token);
  const openAuthDialog = useAuthDialogStore((s) => s.open);
  const [respecting, setRespecting] = useState(
    post.viewerHasRespected === true,
  );
  const [respectCount, setRespectCount] = useState(post.respectCount ?? 0);
  const [reposting, setReposting] = useState(post.viewerHasReposted === true);
  const [repostCount, setRepostCount] = useState(post.repostCount ?? 0);
  const [bookmarked, setBookmarked] = useState(
    post.viewerHasBookmarked === true,
  );
  const [bookmarkCount, setBookmarkCount] = useState(post.bookmarkCount ?? 0);
  const [busy, setBusy] = useState<BlogCardEngagementBusy>(null);
  const [squadShareOpen, setSquadShareOpen] = useState(false);
  const stateRef = useRef({
    respecting: post.viewerHasRespected === true,
    reposting: post.viewerHasReposted === true,
    bookmarked: post.viewerHasBookmarked === true,
  });
  useEffect(() => {
    stateRef.current = { respecting, reposting, bookmarked };
  }, [respecting, reposting, bookmarked]);
  useEffect(() => {
    if (typeof post.viewerHasRespected === "boolean")
      setRespecting(post.viewerHasRespected);
    if (typeof post.respectCount === "number")
      setRespectCount(post.respectCount);
    if (typeof post.viewerHasReposted === "boolean")
      setReposting(post.viewerHasReposted);
    if (typeof post.repostCount === "number") setRepostCount(post.repostCount);
    if (typeof post.viewerHasBookmarked === "boolean")
      setBookmarked(post.viewerHasBookmarked);
    if (typeof post.bookmarkCount === "number")
      setBookmarkCount(post.bookmarkCount);
  }, [
    post.id,
    post.viewerHasRespected,
    post.respectCount,
    post.viewerHasReposted,
    post.repostCount,
    post.viewerHasBookmarked,
    post.bookmarkCount,
  ]);
  useEffect(() => {
    if (!token || !post.id) return;
    const needsRespect = post.viewerHasRespected === undefined;
    const needsRepost = post.viewerHasReposted === undefined;
    const needsBookmark = post.viewerHasBookmarked === undefined;
    if (!needsRespect && !needsRepost && !needsBookmark) return;
    let cancelled = false;
    void blogApi.postEngagementViewerState([post.id], token).then((s) => {
      if (cancelled) return;
      const id = post.id!;
      if (needsRespect) setRespecting(!!s.viewerRespectStates[id]);
      if (needsRepost) setReposting(!!s.viewerRepostStates[id]);
      if (needsBookmark) setBookmarked(!!s.viewerBookmarkStates[id]);
    });
    return () => {
      cancelled = true;
    };
  }, [
    token,
    post.id,
    post.viewerHasRespected,
    post.viewerHasReposted,
    post.viewerHasBookmarked,
  ]);
  const requireToken = useCallback(() => {
    if (!token) {
      openAuthDialog("login");
      return null;
    }
    return token;
  }, [token, openAuthDialog]);
  const toggleRespect = useCallback(
    async (source?: Element) => {
      const t = requireToken();
      if (!t) return;
      const wantOn = !stateRef.current.respecting;
      setBusy("respect");
      try {
        const r = await blogApi.setPostRespect(username, slug, wantOn, t);
        handleAchievementsResponse(r);
        setRespecting(r.respecting);
        setRespectCount(r.respectCount);
        if (r.respecting && wantOn && source) {
          triggerRespectLightning(source);
        }
        if (wantOn && !r.respecting) {
          toast.info("You can’t Respect your own post.");
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not update Respect",
        );
      } finally {
        setBusy(null);
      }
    },
    [requireToken, username, slug],
  );
  const toggleRepost = useCallback(async () => {
    const t = requireToken();
    if (!t) return;
    const wantOn = !stateRef.current.reposting;
    setBusy("repost");
    try {
      const r = await blogApi.setPostRepost(username, slug, wantOn, t);
      setReposting(r.reposting);
      setRepostCount(r.repostCount);
      if (wantOn && !r.reposting) {
        toast.info("You can’t Repost your own post.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update repost");
    } finally {
      setBusy(null);
    }
  }, [requireToken, username, slug]);
  const toggleBookmark = useCallback(async () => {
    const t = requireToken();
    if (!t) return;
    const wantOn = !stateRef.current.bookmarked;
    setBusy("bookmark");
    try {
      const r = await blogApi.setPostBookmark(username, slug, wantOn, t);
      setBookmarked(r.bookmarked);
      setBookmarkCount(r.bookmarkCount);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update bookmark");
    } finally {
      setBusy(null);
    }
  }, [requireToken, username, slug]);
  const sharePost = useCallback(() => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/blogs/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`
        : "";
    const title = post.title;
    if (navigator.share) {
      void navigator.share({ title, url }).catch(() => {
        void navigator.clipboard
          .writeText(url)
          .then(() => toast.success("Link copied"));
      });
    } else {
      void navigator.clipboard
        .writeText(url)
        .then(() => toast.success("Link copied"));
    }
  }, [username, slug, post.title]);
  const openSquadShare = useCallback(() => {
    if (!post.id) return;
    if (!token) {
      openAuthDialog("login");
      return;
    }
    setSquadShareOpen(true);
  }, [post.id, token, openAuthDialog]);
  return {
    respecting,
    respectCount,
    reposting,
    repostCount,
    bookmarked,
    bookmarkCount,
    busy,
    squadShareOpen,
    setSquadShareOpen,
    toggleRespect,
    toggleRepost,
    toggleBookmark,
    sharePost,
    openSquadShare,
  };
}
