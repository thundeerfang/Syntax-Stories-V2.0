"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { RankCountPill } from "@/features/topics";
import {
  FOLLOWED_CATEGORIES_CHANGED_EVENT,
  isCategoryFollowedForViewer,
  shouldHandleFollowedCategoriesEvent,
  toggleFollowedCategorySlug,
} from "@/lib/feeds/followedCategoriesStorage";
import { cn } from "@/lib/core/utils";
import { useAuthDialogStore } from "@/store/authDialog";
import { useAuthStore } from "@/store/auth";
import {
  triggerFollowConfetti,
  followConfettiRectFromClick,
} from "@/store/engagementEffects";
import { toast } from "sonner";
import { explore } from "@/lib/styles";
export type FeaturedCategoryCardProps = Readonly<{
  slug: string;
  name: string;
  description: string;
  postCount: number;
  href?: string;
  className?: string;
}>;
export function FeaturedCategoryCard({
  slug,
  name,
  description,
  postCount,
  href = `/topics/category/${encodeURIComponent(slug)}`,
  className,
}: FeaturedCategoryCardProps) {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? s.user?._id ?? null);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const openAuth = useAuthDialogStore((s) => s.open);
  const [following, setFollowing] = useState(false);
  const sync = useCallback(() => {
    setFollowing(
      isCategoryFollowedForViewer(slug, { token, userId, isHydrated }),
    );
  }, [slug, userId, token, isHydrated]);
  useEffect(() => {
    sync();
  }, [sync]);
  useEffect(() => {
    const onChanged = (event: Event) => {
      if (!shouldHandleFollowedCategoriesEvent(event, userId)) return;
      sync();
    };
    window.addEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onChanged);
    window.addEventListener("storage", onChanged);
    return () => {
      window.removeEventListener(FOLLOWED_CATEGORIES_CHANGED_EVENT, onChanged);
      window.removeEventListener("storage", onChanged);
    };
  }, [sync, userId]);
  const onFollowClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!token || !userId) {
      openAuth("login");
      return;
    }
    const nowFollowing = toggleFollowedCategorySlug(slug, userId);
    setFollowing(nowFollowing);
    if (nowFollowing) {
      triggerFollowConfetti(followConfettiRectFromClick(e.currentTarget));
    }
    toast.success(nowFollowing ? `Following ${name}` : `Unfollowed ${name}`);
  };
  return (
    <div className={cn(explore.categoryCardFrame, className)}>
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-primary">
              Category
            </span>
            <h3 className="mt-1.5 font-mono text-lg font-black uppercase leading-snug tracking-tight text-foreground">
              {name}
            </h3>
          </Link>
          <p className="mt-2 line-clamp-3 font-mono text-[10px] uppercase leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <RankCountPill count={postCount} className="self-start" />
      </div>
      <div className="mt-4">
        <Button
          type="button"
          variant={following ? "outline" : "primary"}
          size="sm"
          className={cn(
            "w-full font-mono text-[9px] font-black uppercase tracking-widest active:translate-x-0 active:translate-y-0 active:shadow",
            following &&
              "border-2 border-primary bg-primary/10 text-primary hover:bg-primary/15",
          )}
          onClick={onFollowClick}
        >
          {following ? "Following" : "Follow"}
        </Button>
      </div>
    </div>
  );
}
