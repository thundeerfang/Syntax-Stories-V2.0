"use client";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Repeat2, Share2, UsersRound } from "lucide-react";
import { squadsApi, type SquadSummary } from "@/api/squads";
import { FormDialog } from "@/components/ui/dialog";
import { BookmarkLottie, SparkLottie } from "@/components/ui";
import {
  computeHoverCardPositionAuto,
  HOVER_CARD_Z_INDEX,
  motionAxisOffset,
  SquadPopoverCard,
  SQUAD_POPOVER_CARD_HEIGHT_PX,
  SQUAD_POPOVER_CARD_WIDTH_PX,
  squadPopoverIconSrc,
  type HoverCardSide,
} from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useBlogCardEngagement } from "@/hooks/useBlogCardEngagement";
import { useAuthStore } from "@/store/auth";
import { RetroCardActionButton } from "@/components/ui/button";
import { cn } from "@/lib/core/utils";
import { blog } from "@/lib/styles";
import { toast } from "sonner";
import type { Post } from "@/types";
import type { PublicFeedSquad } from "@/types/blog";
type ShareToSquadDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  accessToken: string;
  postId: string;
}>;
export function ShareToSquadDialog({
  open,
  onClose,
  accessToken,
  postId,
}: ShareToSquadDialogProps) {
  const [squads, setSquads] = useState<SquadSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void squadsApi
      .listMine(accessToken)
      .then((r) => {
        if (!cancelled) setSquads(r.squads);
      })
      .catch(() => {
        if (!cancelled) setSquads([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, accessToken]);
  const share = async (slug: string) => {
    setSharing(slug);
    try {
      await squadsApi.sharePost(slug, postId, accessToken);
      toast.success("Shared to squad");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not share");
    } finally {
      setSharing(null);
    }
  };
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Share to squad"
      titleId="share-squad-title"
      titleIcon={
        <Share2
          className="h-5 w-5 text-primary"
          strokeWidth={2.5}
          aria-hidden
        />
      }
      subtitle="Pick a squad you belong to."
      interactionLock={sharing !== null}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your squads…</p>
      ) : squads.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Join or create a squad first, then you can share feed posts into it.
        </p>
      ) : (
        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {squads.map((s) => (
            <li key={s._id}>
              <button
                type="button"
                disabled={sharing !== null}
                onClick={() => void share(s.slug)}
                className={cn(
                  "flex w-full items-center gap-3 border-2 border-border bg-card px-3 py-2 text-left text-sm font-semibold transition-colors",
                  "hover:border-primary hover:bg-primary/5",
                  sharing === s.slug && "opacity-60",
                )}
              >
                {s.iconUrl ? (
                  <img
                    src={s.iconUrl}
                    alt=""
                    className="size-9 shrink-0 border-2 border-border object-cover"
                  />
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center border-2 border-border bg-muted text-[10px] font-black uppercase text-muted-foreground">
                    {s.name.slice(0, 1)}
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </FormDialog>
  );
}
import { LINK_HOVER_EXIT_MS } from "@/variable";
const SQUAD_HOVER_GAP_PX = 4;
export function BlogCardSquadChip({
  squad,
}: Readonly<{
  squad: PublicFeedSquad;
}>) {
  const router = useRouter();
  const wrapRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [resolvedSide, setResolvedSide] = useState<HoverCardSide>("bottom");
  const [privateWarnOpen, setPrivateWarnOpen] = useState(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const squadHref = `/squads/${encodeURIComponent(squad.slug)}`;
  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);
  const scheduleOpen = useCallback(() => {
    clearTimers();
    openTimerRef.current = setTimeout(() => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const { top, left, side } = computeHoverCardPositionAuto(
        rect,
        "top",
        "center",
        SQUAD_POPOVER_CARD_HEIGHT_PX,
        SQUAD_POPOVER_CARD_WIDTH_PX,
        SQUAD_HOVER_GAP_PX,
      );
      setPosition({ top, left });
      setResolvedSide(side);
      setOpen(true);
      setIsClosing(false);
      openTimerRef.current = null;
    }, 200);
  }, [clearTimers]);
  const scheduleClose = useCallback(() => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => {
      setIsClosing(true);
      setOpen(false);
      closeTimerRef.current = null;
      exitTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        exitTimerRef.current = null;
      }, LINK_HOVER_EXIT_MS);
    }, 100);
  }, [clearTimers]);
  const cancelClose = useCallback(() => {
    clearTimers();
    setIsClosing(false);
    setOpen(true);
  }, [clearTimers]);
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);
  useEffect(() => {
    if (!open || isClosing) return;
    const onResize = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const { top, left, side } = computeHoverCardPositionAuto(
        rect,
        "top",
        "center",
        SQUAD_POPOVER_CARD_HEIGHT_PX,
        SQUAD_POPOVER_CARD_WIDTH_PX,
        SQUAD_HOVER_GAP_PX,
      );
      setPosition({ top, left });
      setResolvedSide(side);
    };
    globalThis.addEventListener("resize", onResize);
    return () => globalThis.removeEventListener("resize", onResize);
  }, [open, isClosing]);
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => {
      clearTimers();
      setIsClosing(true);
      setOpen(false);
      exitTimerRef.current = setTimeout(() => {
        setIsClosing(false);
        exitTimerRef.current = null;
      }, LINK_HOVER_EXIT_MS);
    };
    globalThis.addEventListener("scroll", handleScroll, true);
    return () => globalThis.removeEventListener("scroll", handleScroll, true);
  }, [open, clearTimers]);
  const axis = motionAxisOffset(resolvedSide);
  const onLogoClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (squad.visibility === "public") {
        router.push(squadHref);
        return;
      }
      setPrivateWarnOpen(true);
    },
    [router, squad.visibility, squadHref],
  );
  const iconSrc = squadPopoverIconSrc(squad);
  const portal =
    (open || isClosing) &&
    typeof document !== "undefined" &&
    createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: axis.y, x: axis.x }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: axis.y, x: axis.x }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed overflow-visible p-0 pointer-events-auto"
            style={{
              top: position.top,
              left: position.left,
              zIndex: HOVER_CARD_Z_INDEX,
            }}
            role="tooltip"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <SquadPopoverCard
              squad={squad}
              squadHref={squadHref}
              interactiveSurface={squad.visibility === "public"}
            />
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );
  return (
    <>
      <RetroCardActionButton
        ref={wrapRef}
        type="button"
        onClick={onLogoClick}
        title={
          squad.visibility === "public" ? squad.name : `${squad.name} (private)`
        }
        aria-label="Squad"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        className="overflow-hidden border-border bg-muted p-0 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <img src={iconSrc} alt="" className="size-full object-cover" />
      </RetroCardActionButton>
      {portal}
      <ConfirmDialog
        open={privateWarnOpen}
        onClose={() => setPrivateWarnOpen(false)}
        titleId="blog-card-private-squad-title"
        title="This squad is private"
        variant="warning"
        message="Only members can open the full squad page. Ask someone in the squad for an invite."
        confirmLabel="Got it"
        hideCancel
        onConfirm={() => setPrivateWarnOpen(false)}
      />
    </>
  );
}
function formatEngagementCount(n: number): string {
  if (n > 99) return "99+";
  return String(Math.max(0, n));
}
function EngagementCountBubble({
  count,
}: Readonly<{
  count: number;
}>) {
  return (
    <span
      className={cn(
        "absolute -right-2 -top-2 z-10 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center  border-2 border-border px-0.5",
        "bg-primary font-mono text-[8px] font-black tabular-nums leading-none text-primary-foreground",
      )}
      aria-hidden
    >
      {formatEngagementCount(count)}
    </span>
  );
}
export type BlogCardEngagementRailProps = Readonly<{
  post: Post;
  className?: string;
}>;
export function BlogCardEngagementRail({
  post,
  className,
}: BlogCardEngagementRailProps) {
  const token = useAuthStore((s) => s.token);
  const {
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
  } = useBlogCardEngagement(post);
  const [hoverRespect, setHoverRespect] = useState(false);
  const [hoverBookmark, setHoverBookmark] = useState(false);
  const lottieSize = 18;
  const actionsDisabled = busy !== null;
  return (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center gap-1.5 self-center",
          className,
        )}
      >
        <RetroCardActionButton
          type="button"
          disabled={actionsDisabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void toggleRespect(e.currentTarget);
          }}
          onMouseEnter={() => setHoverRespect(true)}
          onMouseLeave={() => setHoverRespect(false)}
          aria-label={`${respecting ? "Respecting" : "Respect"} (${formatEngagementCount(respectCount)})`}
          aria-pressed={respecting}
          title="Respect"
          className={busy === "respect" ? "opacity-60" : undefined}
        >
          <span
            className={cn(
              blog.cardIconWrap,
              respecting && " bg-primary/15 dark:bg-primary/20",
            )}
          >
            {hoverRespect && !respecting ? (
              <SparkLottie play size={lottieSize} />
            ) : (
              <img
                src="/svg/icons8-lightning-bolt.svg"
                alt=""
                className="h-4 w-4 object-contain"
                aria-hidden
              />
            )}
            <EngagementCountBubble count={respectCount} />
          </span>
        </RetroCardActionButton>

        <RetroCardActionButton
          type="button"
          disabled={actionsDisabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void toggleRepost();
          }}
          aria-label={`${reposting ? "Reposted" : "Repost"} (${formatEngagementCount(repostCount)})`}
          aria-pressed={reposting}
          title="Repost"
          className={busy === "repost" ? "opacity-60" : undefined}
        >
          <span
            className={cn(
              blog.cardIconWrap,
              reposting && " bg-primary/15 text-primary dark:bg-primary/20",
            )}
          >
            <Repeat2
              className={cn("h-4 w-4", reposting && "text-primary")}
              strokeWidth={reposting ? 2.75 : 2.5}
              aria-hidden
            />
            <EngagementCountBubble count={repostCount} />
          </span>
        </RetroCardActionButton>

        <RetroCardActionButton
          type="button"
          disabled={actionsDisabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void toggleBookmark();
          }}
          onMouseEnter={() => setHoverBookmark(true)}
          onMouseLeave={() => setHoverBookmark(false)}
          aria-label={`${bookmarked ? "Saved" : "Bookmark"} (${formatEngagementCount(bookmarkCount)})`}
          aria-pressed={bookmarked}
          title="Bookmark"
          className={busy === "bookmark" ? "opacity-60" : undefined}
        >
          <span
            className={cn(
              blog.cardIconWrap,
              bookmarked && " bg-primary/15 text-primary dark:bg-primary/20",
            )}
          >
            {bookmarked ? (
              <Bookmark
                className="h-4 w-4 fill-primary text-primary"
                strokeWidth={2.5}
                aria-hidden
              />
            ) : hoverBookmark ? (
              <BookmarkLottie play size={lottieSize} />
            ) : (
              <Bookmark
                className="h-4 w-4 text-foreground/75"
                strokeWidth={2.5}
                aria-hidden
              />
            )}
            <EngagementCountBubble count={bookmarkCount} />
          </span>
        </RetroCardActionButton>

        {post.id ? (
          <>
            {post.squad ? (
              <BlogCardSquadChip squad={post.squad} />
            ) : (
              <RetroCardActionButton
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openSquadShare();
                }}
                aria-label="Share to squad"
                title="Share to squad"
              >
                <span className={blog.cardIconWrap}>
                  <UsersRound
                    className="h-4 w-4 text-foreground/75"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                </span>
              </RetroCardActionButton>
            )}
          </>
        ) : null}

        <RetroCardActionButton
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            sharePost();
          }}
          aria-label="Share"
          title="Share"
        >
          <span className={blog.cardIconWrap}>
            <Share2
              className="h-4 w-4 text-foreground/75"
              strokeWidth={2.5}
              aria-hidden
            />
          </span>
        </RetroCardActionButton>
      </div>

      {token && post.id && !post.squad ? (
        <ShareToSquadDialog
          open={squadShareOpen}
          onClose={() => setSquadShareOpen(false)}
          accessToken={token}
          postId={post.id}
        />
      ) : null}
    </>
  );
}
