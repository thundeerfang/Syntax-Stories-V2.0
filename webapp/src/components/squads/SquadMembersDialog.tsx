"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  MoreHorizontal,
  Search,
  Shield,
  UserMinus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { followApi } from "@/api/follow";
import { squadsApi, type SquadMemberRole } from "@/api/squads";
import {
  ConfirmDialog,
  FormDialog,
  DIALOG_Z_INDEX_STACKED,
} from "@/components/ui/dialog";
import { SquadMemberContributionDialog } from "./SquadMemberContributionDialog";
import { SquadPromoteRoleDialog } from "./SquadPromoteRoleDialog";
import { cn } from "@/lib/core/utils";
import { resolveProfileMediaUrl } from "@/lib/profile/resolveProfileMediaUrl";
import { toast } from "sonner";
export type SquadMembersDialogRow = {
  userId: string;
  username: string;
  fullName: string;
  profileImg: string;
  role: SquadMemberRole;
  joinedAt?: string;
};
function roleLabel(role: SquadMemberRole): string {
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  return "Member";
}
function roleBadgeClass(role: SquadMemberRole): string {
  if (role === "admin") return "border-primary/50 bg-primary/15 text-primary";
  if (role === "moderator")
    return "border-amber-500/40 bg-amber-400/15 text-amber-800 dark:text-amber-200";
  return "border-border bg-muted/30 text-muted-foreground";
}
type SquadMemberRowProps = Readonly<{
  m: SquadMembersDialogRow;
  me: string;
  isAdmin: boolean;
  creatorUserId?: string;
  accessToken: string | null;
  followingByUser: Record<string, boolean>;
  busyUser: string | null;
  menuUser: string | null;
  setMenuUser: (
    username: string | null | ((cur: string | null) => string | null),
  ) => void;
  onViewContribution: (m: SquadMembersDialogRow) => void;
  onPromote: (m: SquadMembersDialogRow) => void;
  onRemove: (m: SquadMembersDialogRow) => void;
  onToggleFollow: (username: string) => void;
}>;
const MEMBER_MENU_MIN_WIDTH = 176;
const MEMBER_MENU_Z_INDEX = DIALOG_Z_INDEX_STACKED + 10;
function SquadMemberRow({
  m,
  me,
  isAdmin,
  creatorUserId,
  accessToken,
  followingByUser,
  busyUser,
  menuUser,
  setMenuUser,
  onViewContribution,
  onPromote,
  onRemove,
  onToggleFollow,
}: SquadMemberRowProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuPortalRef = useRef<HTMLUListElement>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const label = m.fullName?.trim() || m.username;
  const isSelf = m.username.toLowerCase() === me;
  const isCreator = creatorUserId != null && m.userId === creatorUserId;
  const canFollow = accessToken && !isSelf;
  const canPromote = isAdmin && !isSelf && !isCreator && m.role !== "admin";
  const canRemove = isAdmin && !isSelf && !isCreator && m.role !== "admin";
  const menuOpen = menuUser === m.username;
  const updateMenuPosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const itemCount =
      1 + (canFollow ? 1 : 0) + (canPromote ? 1 : 0) + (canRemove ? 1 : 0);
    const estimatedHeight = itemCount * 36 + 8;
    const gap = 4;
    let top = rect.bottom + gap;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - estimatedHeight - gap);
    }
    const left = Math.min(
      Math.max(8, rect.right - MEMBER_MENU_MIN_WIDTH),
      window.innerWidth - MEMBER_MENU_MIN_WIDTH - 8,
    );
    setMenuPos({ top, left });
  }, [canFollow, canPromote, canRemove]);
  useEffect(() => {
    if (!menuOpen) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
    const onScrollOrResize = () => setMenuUser(null);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [menuOpen, setMenuUser, updateMenuPosition]);
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuPortalRef.current?.contains(t))
        return;
      setMenuUser(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen, setMenuUser]);
  const menuPortal =
    menuOpen &&
    menuPos != null &&
    typeof document !== "undefined" &&
    createPortal(
      <ul
        ref={menuPortalRef}
        role="menu"
        style={{
          top: menuPos.top,
          left: menuPos.left,
          zIndex: MEMBER_MENU_Z_INDEX,
        }}
        className="fixed min-w-[11rem] border-2 border-border bg-card py-1 shadow-lg"
      >
        <li role="none">
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setMenuUser(null);
              onViewContribution(m);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wide hover:bg-muted/60"
          >
            <BarChart3
              className="size-3.5 shrink-0 text-primary"
              strokeWidth={2.25}
              aria-hidden
            />
            View contribution
          </button>
        </li>
        {canFollow ? (
          <li role="none">
            <button
              type="button"
              role="menuitem"
              disabled={busyUser === m.username}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFollow(m.username);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wide hover:bg-muted/60 disabled:opacity-50"
            >
              <UserPlus
                className="size-3.5 shrink-0"
                strokeWidth={2.25}
                aria-hidden
              />
              {followingByUser[m.username] ? "Unfollow" : "Follow"}
            </button>
          </li>
        ) : null}
        {canPromote ? (
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setMenuUser(null);
                onPromote(m);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wide hover:bg-muted/60"
            >
              <Shield
                className="size-3.5 shrink-0 text-primary"
                strokeWidth={2.25}
                aria-hidden
              />
              Change role
            </button>
          </li>
        ) : null}
        {canRemove ? (
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setMenuUser(null);
                onRemove(m);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-[10px] font-bold uppercase tracking-wide text-destructive hover:bg-destructive/10"
            >
              <UserMinus
                className="size-3.5 shrink-0"
                strokeWidth={2.25}
                aria-hidden
              />
              Remove from squad
            </button>
          </li>
        ) : null}
      </ul>,
      document.body,
    );
  return (
    <div className="flex items-center gap-2 border-b border-border/60 py-3 last:border-b-0">
      <Link
        href={`/u/${encodeURIComponent(m.username)}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <img
          src={resolveProfileMediaUrl(m.profileImg, m.username)}
          alt=""
          className="size-11 shrink-0 border-2 border-border object-cover"
        />
        <div className="min-w-0">
          <p className="truncate font-bold text-foreground">{label}</p>
          <p className="truncate font-mono text-[11px] text-muted-foreground">
            @{m.username}
          </p>
          <span
            className={cn(
              "mt-1 inline-block border px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest",
              roleBadgeClass(m.role),
            )}
          >
            {roleLabel(m.role)}
          </span>
        </div>
      </Link>

      <div className="relative shrink-0">
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuUser((cur) => (cur === m.username ? null : m.username));
          }}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Actions for ${label}`}
          className="flex size-9 items-center justify-center border-2 border-border bg-card text-foreground transition-colors hover:border-primary/50 hover:bg-muted/40"
        >
          <MoreHorizontal className="size-4" strokeWidth={2.25} aria-hidden />
        </button>
        {menuPortal}
      </div>
    </div>
  );
}
export function SquadMembersDialog({
  open,
  onClose,
  squadSlug,
  squadName,
  members,
  accessToken,
  myUsername,
  viewerRole,
  creatorUserId,
  onMembersChange,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  squadSlug: string;
  squadName: string;
  members: SquadMembersDialogRow[];
  accessToken: string | null;
  myUsername: string | null | undefined;
  viewerRole?: SquadMemberRole | null;
  creatorUserId?: string;
  onMembersChange?: () => void | Promise<void>;
}>) {
  const titleId = useId();
  const removeTitleId = useId();
  const [q, setQ] = useState("");
  const [followingByUser, setFollowingByUser] = useState<
    Record<string, boolean>
  >({});
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [menuUser, setMenuUser] = useState<string | null>(null);
  const [promoteTarget, setPromoteTarget] =
    useState<SquadMembersDialogRow | null>(null);
  const [contributionTarget, setContributionTarget] =
    useState<SquadMembersDialogRow | null>(null);
  const [removeTarget, setRemoveTarget] =
    useState<SquadMembersDialogRow | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const isAdmin = viewerRole === "admin";
  const me = myUsername?.trim().toLowerCase() ?? "";
  useEffect(() => {
    if (!open) {
      setQ("");
      setMenuUser(null);
    }
  }, [open]);
  useEffect(() => {
    if (!open || !accessToken) {
      setFollowingByUser({});
      return;
    }
    let cancelled = false;
    const others = members.filter((m) => m.username.toLowerCase() !== me);
    void (async () => {
      const entries = await Promise.all(
        others.map(async (m) => {
          try {
            const r = await followApi.checkFollowing(m.username, accessToken);
            return [m.username, r.following === true] as const;
          } catch {
            return [m.username, false] as const;
          }
        }),
      );
      if (!cancelled) setFollowingByUser(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, accessToken, members, me]);
  const ql = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!ql) return members;
    return members.filter((m) => {
      const hay = `${m.username} ${m.fullName}`.toLowerCase();
      return hay.includes(ql);
    });
  }, [members, ql]);
  const staff = useMemo(
    () => filtered.filter((m) => m.role === "admin" || m.role === "moderator"),
    [filtered],
  );
  const regular = useMemo(
    () => filtered.filter((m) => m.role === "member"),
    [filtered],
  );
  const refreshMembers = useCallback(async () => {
    if (onMembersChange) await onMembersChange();
  }, [onMembersChange]);
  const openRemoveConfirm = useCallback(
    (m: SquadMembersDialogRow) => {
      setMenuUser(null);
      setRemoveTarget(m);
      onClose();
    },
    [onClose],
  );
  const toggleFollow = useCallback(
    async (username: string) => {
      if (!accessToken) {
        toast.error("Sign in to follow");
        return;
      }
      setBusyUser(username);
      setMenuUser(null);
      try {
        const isFollowing = followingByUser[username] === true;
        if (isFollowing) {
          await followApi.unfollow(username, accessToken);
          setFollowingByUser((prev) => ({ ...prev, [username]: false }));
          toast.success("Unfollowed");
        } else {
          await followApi.follow(username, accessToken);
          setFollowingByUser((prev) => ({ ...prev, [username]: true }));
          toast.success("Following");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update follow");
      } finally {
        setBusyUser(null);
      }
    },
    [accessToken, followingByUser],
  );
  const confirmRemove = async () => {
    if (!removeTarget || !accessToken) return;
    setRemoveBusy(true);
    try {
      await squadsApi.removeMember(
        squadSlug,
        removeTarget.username,
        accessToken,
      );
      toast.success(`Removed @${removeTarget.username}`);
      setRemoveTarget(null);
      await refreshMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove member");
    } finally {
      setRemoveBusy(false);
    }
  };
  const rowProps = {
    me,
    isAdmin,
    creatorUserId,
    accessToken,
    followingByUser,
    busyUser,
    menuUser,
    setMenuUser,
    onViewContribution: setContributionTarget,
    onPromote: setPromoteTarget,
    onRemove: openRemoveConfirm,
    onToggleFollow: (username: string) => void toggleFollow(username),
  };
  return (
    <>
      <FormDialog
        open={open}
        onClose={onClose}
        titleId={titleId}
        title="Squad members"
        titleIcon={
          <UsersRound
            className="size-5 text-primary"
            strokeWidth={2.5}
            aria-hidden
          />
        }
        subtitle="Admins and moderators are listed first. Search by name or username."
        subtitleClassName="truncate whitespace-nowrap min-w-0"
        panelClassName="max-w-lg"
      >
        <div className="sticky top-0 z-10 -mx-1 border-b border-border bg-card pb-3">
          <label className="relative block">
            <span className="sr-only">Search members</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-10 w-full border-2 border-border bg-background py-2 pl-10 pr-3 text-sm outline-none ring-primary focus-visible:ring-2"
            />
          </label>
        </div>

        {staff.length > 0 ? (
          <div className="mt-4">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Admins & moderators
            </p>
            <div className="border-2 border-border px-2">
              {staff.map((m) => (
                <SquadMemberRow key={m.userId} m={m} {...rowProps} />
              ))}
            </div>
          </div>
        ) : null}

        {regular.length > 0 ? (
          <div
            className={cn(
              "mt-4",
              staff.length > 0 && "border-t border-border pt-4",
            )}
          >
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Members
            </p>
            <div className="border-2 border-border px-2">
              {regular.map((m) => (
                <SquadMemberRow key={m.userId} m={m} {...rowProps} />
              ))}
            </div>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            No members match your search.
          </p>
        ) : null}
      </FormDialog>

      {accessToken ? (
        <SquadPromoteRoleDialog
          open={promoteTarget != null}
          onClose={() => setPromoteTarget(null)}
          squadSlug={squadSlug}
          accessToken={accessToken}
          member={promoteTarget}
          onUpdated={refreshMembers}
        />
      ) : null}

      <SquadMemberContributionDialog
        open={contributionTarget != null}
        onClose={() => setContributionTarget(null)}
        squadSlug={squadSlug}
        squadName={squadName}
        accessToken={accessToken}
        member={contributionTarget}
      />

      <ConfirmDialog
        open={removeTarget != null}
        onClose={() => !removeBusy && setRemoveTarget(null)}
        titleId={removeTitleId}
        title="Remove from squad?"
        variant="danger"
        message={
          removeTarget
            ? `@${removeTarget.username} will be removed from this squad and lose access to the feed and member list.`
            : undefined
        }
        confirmLabel="Remove from squad"
        closeOnConfirm={false}
        loading={removeBusy}
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
}
