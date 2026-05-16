'use client';

import type { ReactNode } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { SquadFeedPinChrome } from '@/features/blog';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Link2,
  Lock,
  LogOut,
  MoreHorizontal,
  Pencil,
  Pin,
  Shield,
  Trash2,
  UserPlus,
  UsersRound,
  MessageSquare,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/layout';
import { CreateSquadDialog } from '@/features/squads';
import { BlogCard } from '@/features/blog';
import { InfoSwiperDialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/dialog';
import { SquadMembersDialog, SquadsDiscoverCategoryView, type SquadMembersDialogRow } from '../components/SquadSlugSections';
import { SQUADS_INTRO_SLIDES } from '@/features/squads';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { isSquadCategory, squadCategoryLabel } from '@/lib/squads/squadCategory';
import { cn } from '@/lib/core/utils';
import { squadsApi, type SquadFeedRow, type SquadMemberRole, type SquadSummary } from '@/api/squads';
import { mapPublicFeedPostToPost } from '@/lib/blog/mapFeedPostToPost';
import { useAuthStore } from '@/store/auth';
import { useAuthDialogStore } from '@/store/authDialog';
import { toast } from 'sonner';


type MemberRow = SquadMembersDialogRow;

function isSquadNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase().trim() : '';
  return msg.includes('not found') || msg.includes('squad not found');
}

function resolveSquadBannerSrc(url: string | undefined): string | undefined {
  const t = url?.trim();
  if (!t) return undefined;
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:')) return t;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return `${base.replace(/\/$/, '')}${t.startsWith('/') ? '' : '/'}${t}`;
}

function memberAvatarSrc(profileImg: string | undefined, username: string): string {
  const trimmed = profileImg?.trim();
  if (!trimmed) {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return `${base.replace(/\/$/, '')}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function formatSquadCreated(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function shuffleWithSeed<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  for (let i = a.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const j = Math.abs(h) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function roleLabelPublic(role: SquadMemberRole): string {
  if (role === 'admin') return 'Admin';
  if (role === 'moderator') return 'Moderator';
  return 'Member';
}

function SectionHeading({ children, icon: Icon }: Readonly<{ children: ReactNode; icon?: LucideIcon }>) {
  return (
    <h3 className="mb-4 flex items-center gap-2 border-b-2 border-border pb-2 font-mono text-xs font-black uppercase tracking-widest text-foreground">
      {Icon ? <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden /> : null}
      {children}
    </h3>
  );
}

function SquadProtocolRules({ squad }: Readonly<{ squad: SquadSummary }>) {
  return (
    <ul className="space-y-3">
      <li className="flex gap-3 text-xs font-bold">
        <span className="font-mono text-primary">01.</span>
        <span>Respect the build. No toxic behavior.</span>
      </li>
      <li className="flex gap-3 text-xs font-bold">
        <span className="font-mono text-primary">02.</span>
        <span>Share insights, not just links.</span>
      </li>
      <li className="flex gap-3 text-xs font-bold">
        <span className="font-mono text-primary">03.</span>
        <span>Keep it relevant to {squad.name}.</span>
      </li>
      {squad.postPolicy === 'staff_only' ? (
        <li className="flex gap-3 text-xs font-bold">
          <span className="font-mono text-primary">04.</span>
          <span>Only admins and moderators can post or share here.</span>
        </li>
      ) : null}
      {squad.requirePostApproval ? (
        <li className="flex gap-3 text-xs font-bold">
          <span className="font-mono text-primary">05.</span>
          <span>New posts may require moderator approval.</span>
        </li>
      ) : null}
      {squad.invitePermission === 'staff_only' ? (
        <li className="flex gap-3 text-xs font-bold">
          <span className="font-mono text-primary">06.</span>
          <span>Only staff can invite new members.</span>
        </li>
      ) : null}
    </ul>
  );
}

export default function SquadDetailPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const myUser = useAuthStore((s) => s.user);
  const openAuth = useAuthDialogStore((s) => s.open);

  const [tab, setTab] = useState('feed');
  const [squad, setSquad] = useState<SquadSummary | null>(null);
  const [feed, setFeed] = useState<SquadFeedRow[]>([]);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [pinConfirm, setPinConfirm] = useState<{ postId: string; mode: 'pin' | 'unpin' } | null>(null);
  const [pinBusy, setPinBusy] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [inviteField, setInviteField] = useState('');
  const [busy, setBusy] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editSquadOpen, setEditSquadOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    const segment = decodeURIComponent(slug);
    if (isSquadCategory(segment)) return;
    try {
      const d = await squadsApi.getBySlug(slug, token);
      setSquad(d.squad);
      const gated =
        d.squad.viewerNeedsInvite === true ||
        (d.squad.visibility === 'private' && d.squad.viewerRole == null);
      if (gated) {
        setFeed([]);
        setPinnedCount(0);
        return;
      }
      const f = await squadsApi.getFeed(slug, token, { limit: 30 });
      setFeed(f.feed);
      setPinnedCount(f.pinnedCount);
    } catch (e) {
      if (isSquadNotFoundError(e)) {
        toast.error(e instanceof Error ? e.message : 'Squad not found');
        setSquad(null);
        setFeed([]);
        setPinnedCount(0);
        router.replace('/');
        return;
      }
      toast.error(e instanceof Error ? e.message : 'Could not load squad');
      setSquad(null);
      setFeed([]);
      setPinnedCount(0);
    }
  }, [slug, token, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (pinnedCount === 0) setShowPinnedOnly(false);
  }, [pinnedCount]);

  useEffect(() => {
    if (!slug || !squad) {
      setMembers([]);
      return;
    }
    const gated =
      squad.viewerNeedsInvite === true || (squad.visibility === 'private' && squad.viewerRole == null);
    if (gated) {
      setMembers([]);
      return;
    }
    let cancelled = false;
    void squadsApi
      .listMembers(slug, token)
      .then((r) => {
        if (!cancelled) setMembers(r.members);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, squad, token]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const staffSorted = useMemo(() => {
    const staff = members.filter((m) => m.role === 'admin' || m.role === 'moderator');
    const cid = squad?.creatorUserId;
    const s = [...staff];
    s.sort((a, b) => {
      const aCreator = cid && a.userId === cid ? 0 : 1;
      const bCreator = cid && b.userId === cid ? 0 : 1;
      if (aCreator !== bCreator) return aCreator - bCreator;
      const order: Record<SquadMemberRole, number> = { admin: 0, moderator: 1, member: 2 };
      return order[a.role] - order[b.role];
    });
    return s;
  }, [members, squad?.creatorUserId]);

  const facepile = useMemo(() => {
    if (!members.length) return [];
    return shuffleWithSeed(members, slug).slice(0, 5);
  }, [members, slug]);

  const modShown = staffSorted.slice(0, 4);
  const modMore = Math.max(0, staffSorted.length - modShown.length);

  const openMembersDialog = useCallback(() => setMembersDialogOpen(true), []);

  const join = async () => {
    if (!token) {
      openAuth('login');
      return;
    }
    if (!slug) return;
    setBusy(true);
    try {
      await squadsApi.join(slug, token, squad?.visibility === 'private' ? inviteField.trim() : undefined);
      toast.success('Joined squad');
      setInviteField('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not join');
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!token || !slug) return;
    setBusy(true);
    try {
      await squadsApi.leave(slug, token);
      toast.success('Left squad');
      setLeaveOpen(false);
      router.push('/squads');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not leave');
    } finally {
      setBusy(false);
    }
  };

  const deleteSquadFn = async () => {
    if (!token || !slug) return;
    setBusy(true);
    try {
      await squadsApi.delete(slug, token);
      toast.success('Squad deleted');
      setDeleteOpen(false);
      router.push('/squads');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete');
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    const t = squad?.inviteToken;
    if (!t || typeof window === 'undefined') return;
    const url = `${window.location.origin}/squads/${encodeURIComponent(slug)}`;
    const text = `Join our squad on Syntax Stories\n${url}\nInvite code: ${t}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Invitation copied');
    } catch {
      toast.error('Could not copy');
    }
    setMenuOpen(false);
  };

  const displayedFeed = useMemo(() => {
    if (!showPinnedOnly) return feed;
    return feed.filter((r) => r.pinned === true);
  }, [feed, showPinnedOnly]);

  const confirmPinAction = useCallback(async () => {
    if (!pinConfirm || !token || !slug) return;
    setPinBusy(true);
    try {
      if (pinConfirm.mode === 'pin') {
        await squadsApi.pinFeedPost(slug, pinConfirm.postId, token);
        toast.success('Post pinned for this squad');
      } else {
        await squadsApi.unpinFeedPost(slug, pinConfirm.postId, token);
        toast.success('Post unpinned');
      }
      setPinConfirm(null);
      const f = await squadsApi.getFeed(slug, token, { limit: 30 });
      setFeed(f.feed);
      setPinnedCount(f.pinnedCount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update pin');
    } finally {
      setPinBusy(false);
    }
  }, [pinConfirm, token, slug]);

  if (!slug) {
    return null;
  }

  const viewerRole = squad?.viewerRole;
  const isMember = viewerRole != null;
  const isAdmin = viewerRole === 'admin';

  const feedVisible =
    squad &&
    !(squad.viewerNeedsInvite === true || (squad.visibility === 'private' && squad.viewerRole == null));

  const createdLabel = formatSquadCreated(squad?.createdAt);
  const bannerSrc = squad ? resolveSquadBannerSrc(squad.coverBannerUrl) : undefined;

  const gridPattern =
    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L30 60M0 30L60 30' fill='none' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E\")";

  const categorySegment = decodeURIComponent(slug);
  if (isSquadCategory(categorySegment)) {
    return (
      <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col')}>
        <SquadsDiscoverCategoryView categoryParam={categorySegment} />
      </div>
    );
  }

  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'relative min-h-0 flex-1')}>
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03] dark:opacity-[0.07]"
        style={{ backgroundImage: gridPattern }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-6 pb-10">
        {!squad ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <header className="relative z-20 mt-2 overflow-visible border-4 border-border bg-card shadow">
              <div className="relative h-56 w-full overflow-hidden border-b-4 border-border sm:h-72">
                {bannerSrc ? (
                  <img src={bannerSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full gradient-auto" aria-hidden />
                )}
              </div>
              <div className="relative px-4 pb-6 pt-5 sm:px-6 sm:pt-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="relative -mt-14 shrink-0 sm:-mt-16">
                      {squad.iconUrl ? (
                        <img
                          src={squad.iconUrl}
                          alt=""
                          className="size-24 border-4 border-border bg-card object-cover shadow sm:size-32"
                        />
                      ) : (
                        <div className="flex size-24 items-center justify-center border-4 border-border bg-primary text-3xl font-black text-primary-foreground shadow sm:size-32 sm:text-4xl">
                          {squad.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {squad.visibility === 'private' ? (
                        <div
                          className="absolute -right-2 -top-2 border-2 border-border bg-yellow-400 p-1.5 text-black shadow"
                          aria-hidden
                        >
                          <Lock className="size-4" strokeWidth={2.5} />
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-foreground sm:text-4xl lg:text-5xl">
                          {squad.name}
                        </h1>
                        {squad.visibility === 'public' && squad.category ? (
                          <span className="border-2 border-primary bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-primary">
                            {squadCategoryLabel(squad.category)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 font-mono text-sm font-bold text-muted-foreground">
                        @{squad.handle ?? squad.slug}
                        {createdLabel ? (
                          <>
                            <span className="text-border"> · </span>
                            <span>Created {createdLabel}</span>
                          </>
                        ) : null}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
                        <div className="flex items-center gap-2">
                          {facepile.length > 0 ? (
                            <div className="flex -space-x-2">
                              {facepile.map((m) => (
                                <img
                                  key={m.userId}
                                  src={memberAvatarSrc(m.profileImg, m.username)}
                                  alt=""
                                  className="size-9 border-2 border-border bg-muted object-cover"
                                  title={m.username}
                                />
                              ))}
                            </div>
                          ) : null}
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary tabular-nums">
                            {squad.memberCount.toLocaleString()} members
                          </span>
                        </div>

                        {feedVisible && staffSorted.length > 0
                          ? modShown.map((m) => (
                              <Link
                                key={m.userId}
                                href={`/u/${encodeURIComponent(m.username)}`}
                                className="inline-flex items-center gap-1.5 border-2 border-primary/45 bg-primary/5 px-2 py-1 transition-colors hover:border-primary"
                              >
                                <img
                                  src={memberAvatarSrc(m.profileImg, m.username)}
                                  alt=""
                                  className="size-6 border border-primary/30 object-cover"
                                />
                                <span className="max-w-[6.5rem] truncate text-[11px] font-bold text-foreground">
                                  {m.fullName?.trim() || m.username}
                                </span>
                                <span className="font-mono text-[8px] font-black uppercase text-primary">
                                  {roleLabelPublic(m.role)}
                                </span>
                              </Link>
                            ))
                          : null}
                        {feedVisible && staffSorted.length > 0 && modMore > 0 ? (
                          <button
                            type="button"
                            onClick={openMembersDialog}
                            className="inline-flex items-center border-2 border-dashed border-primary/50 px-2 py-1 font-mono text-[9px] font-black uppercase tracking-wide text-primary transition-colors hover:border-primary"
                          >
                            +{modMore} more
                          </button>
                        ) : null}
                        {feedVisible && staffSorted.length === 0 ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            No staff listed
                          </span>
                        ) : null}
                        {!feedVisible ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            · Join to see staff
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="relative z-30 flex flex-wrap items-center gap-2 sm:shrink-0">
                    {!isMember ? (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          disabled={busy}
                          className="h-12 border-b-4 border-r-4 border-primary font-black uppercase italic tracking-widest"
                          onClick={() => void join()}
                        >
                          <UserPlus className="mr-2 size-5 shrink-0" strokeWidth={2.5} aria-hidden />
                          Join squad
                        </Button>
                        {squad.visibility === 'private' ? (
                          <input
                            value={inviteField}
                            onChange={(e) => setInviteField(e.target.value)}
                            placeholder="Invite code"
                            className="h-12 min-w-[9rem] border-2 border-border bg-background px-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          />
                        ) : null}
                      </>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openMembersDialog}
                      className="h-12 border-b-4 border-r-4 font-mono text-[10px] font-black uppercase tracking-widest"
                    >
                      <UsersRound className="size-5 shrink-0" strokeWidth={2} aria-hidden />
                      Members
                    </Button>
                    <div ref={menuRef} className="relative z-40">
                      <Button
                        type="button"
                        variant="outline"
                        aria-expanded={menuOpen}
                        aria-haspopup="menu"
                        aria-label="Squad menu"
                        className="size-12 border-b-4 border-r-4 p-0"
                        onClick={() => setMenuOpen((o) => !o)}
                      >
                        <MoreHorizontal className="size-6 shrink-0" strokeWidth={2} aria-hidden />
                      </Button>
                      {menuOpen ? (
                        <ul
                          role="menu"
                          className="absolute right-0 top-[calc(100%+8px)] z-[100] min-w-[14rem] border-2 border-border bg-card py-1 shadow"
                        >
                          {isAdmin && token ? (
                            <li role="none">
                              <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted/60"
                                onClick={() => {
                                  setMenuOpen(false);
                                  setEditSquadOpen(true);
                                }}
                              >
                                <Pencil className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                                Edit squad
                              </button>
                            </li>
                          ) : null}
                          {isMember ? (
                            <li role="none">
                              <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted/60"
                                onClick={() => {
                                  setMenuOpen(false);
                                  setLeaveOpen(true);
                                }}
                              >
                                <LogOut className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                                Leave group
                              </button>
                            </li>
                          ) : null}
                          {isAdmin ? (
                            <li role="none">
                              <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-destructive hover:bg-muted/60"
                                onClick={() => {
                                  setMenuOpen(false);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                                Delete squad
                              </button>
                            </li>
                          ) : null}
                          {isAdmin && squad.visibility === 'private' && squad.inviteToken ? (
                            <li role="none">
                              <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted/60"
                                onClick={() => void copyInvite()}
                              >
                                <Link2 className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                                Copy invitation
                              </button>
                            </li>
                          ) : null}
                          <li role="none">
                            <button
                              type="button"
                              role="menuitem"
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted/60"
                              onClick={() => {
                                setMenuOpen(false);
                                setMembersDialogOpen(true);
                              }}
                            >
                              <UsersRound className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                              All members
                            </button>
                          </li>
                          <li role="none">
                            <button
                              type="button"
                              role="menuitem"
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted/60"
                              onClick={() => {
                                setMenuOpen(false);
                                setIntroOpen(true);
                              }}
                            >
                              <BookOpen className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                              How squads work
                            </button>
                          </li>
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <Tabs value={tab} onValueChange={setTab} className="w-full min-w-0">
              <div className="mb-6 flex min-w-0 flex-wrap items-end gap-2 border-b-4 border-border pb-px">
                <TabsList variant="retro" className="mb-0 min-h-0 min-w-0 flex-1 border-0">
                  <TabsTrigger value="feed" variant="retro">
                    <LayoutGrid className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                    Squad feed
                  </TabsTrigger>
                  <TabsTrigger value="resources" variant="retro">
                    <BookOpen className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                    Resources
                  </TabsTrigger>
                </TabsList>
                {feedVisible && tab === 'feed' ? (
                  <button
                    type="button"
                    disabled={pinnedCount === 0 && !showPinnedOnly}
                    onClick={() => setShowPinnedOnly((v) => !v)}
                    title={
                      showPinnedOnly
                        ? 'Show full squad feed'
                        : pinnedCount === 0
                          ? 'No pinned posts yet'
                          : 'Show only pinned posts'
                    }
                    className={cn(
                      'inline-flex shrink-0 items-center gap-2 border-2 border-border bg-card px-3 py-2 font-mono text-[10px] font-black uppercase tracking-widest shadow transition-colors',
                      'hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40',
                      showPinnedOnly && 'border-primary bg-primary/10 text-primary',
                    )}
                  >
                    <Pin className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
                    <span>Pinned</span>
                    <span className="flex size-6 items-center justify-center border-2 border-border bg-muted text-[10px] font-black tabular-nums text-foreground">
                      {pinnedCount}
                    </span>
                  </button>
                ) : null}
              </div>

              <TabsContent value="feed" className="min-h-0 overflow-x-hidden overflow-y-visible">
                {!feedVisible ? (
                  <p className="text-sm text-muted-foreground">Join this squad to see the feed.</p>
                ) : feed.length === 0 ? (
                  <div className="border-4 border-dotted border-border py-20 text-center">
                    <MessageSquare
                      className="mx-auto size-12 text-muted-foreground/30"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <p className="mt-4 font-mono text-sm font-bold uppercase text-muted-foreground">
                      Static detected. No signals found.
                    </p>
                  </div>
                ) : displayedFeed.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pinned posts yet. Squad admins can pin posts from the feed.
                  </p>
                ) : (
                  <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 sm:gap-3 md:gap-4 lg:grid-cols-3 lg:gap-4">
                    {displayedFeed.map((row, i) => {
                      const pinChrome: SquadFeedPinChrome | undefined =
                        row.pinned || isAdmin
                          ? {
                              isPinned: row.pinned === true,
                              canModerate: isAdmin,
                              onPin: () => setPinConfirm({ postId: row.item._id, mode: 'pin' }),
                              onUnpin: () => setPinConfirm({ postId: row.item._id, mode: 'unpin' }),
                            }
                          : undefined;
                      return (
                        <li key={`${row.kind}-${row.item._id}-${i}`} className="flex min-h-0 flex-col gap-2">
                          {row.kind === 'shared' ? (
                            <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                              Shared to squad
                            </p>
                          ) : null}
                          <BlogCard post={mapPublicFeedPostToPost(row.item)} squadFeedPin={pinChrome} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </TabsContent>

              <TabsContent
                value="resources"
                className="min-h-0 space-y-6 overflow-x-hidden overflow-y-visible border-2 border-border bg-card p-5 shadow"
              >
                <div>
                  <SectionHeading icon={BookOpen}>About this squad</SectionHeading>
                  <p className="text-sm leading-relaxed text-foreground/85">
                    {squad.description?.trim() ||
                      'No description has been set yet. Admins can add context so new members know what this squad is for.'}
                  </p>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Handle{' '}
                    <span className="font-mono font-bold text-foreground">@{squad.handle ?? squad.slug}</span>
                    {createdLabel ? (
                      <>
                        {' '}
                        · Created {createdLabel}
                      </>
                    ) : null}
                    {' '}
                    ·{' '}
                    {squad.visibility === 'public' ? 'Public squad' : 'Private squad'}
                  </p>
                </div>
                <div>
                  <SectionHeading icon={Shield}>Squad rules</SectionHeading>
                  <SquadProtocolRules squad={squad} />
                </div>
                <div className="flex flex-wrap gap-2 border-t-2 border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-mono text-[10px] font-black uppercase tracking-widest"
                    onClick={() => setIntroOpen(true)}
                  >
                    How squads work
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-mono text-[10px] font-black uppercase tracking-widest"
                    onClick={() => router.push('/squads')}
                  >
                    All squads
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {token && squad && isAdmin ? (
        <CreateSquadDialog
          open={editSquadOpen}
          onClose={() => setEditSquadOpen(false)}
          accessToken={token}
          mode="edit"
          initialSquad={squad}
          onUpdated={(next) => {
            setSquad((prev) =>
              prev
                ? {
                    ...next,
                    viewerRole: prev.viewerRole,
                    viewerIsStaff: prev.viewerIsStaff,
                    viewerNeedsInvite: prev.viewerNeedsInvite,
                    inviteToken: prev.inviteToken,
                  }
                : next,
            );
          }}
        />
      ) : null}

      <SquadMembersDialog
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
        members={members}
        accessToken={token}
        myUsername={myUser?.username}
      />

      <InfoSwiperDialog
        open={introOpen}
        onClose={() => setIntroOpen(false)}
        slides={SQUADS_INTRO_SLIDES}
        titleId="squad-detail-intro"
      />

      <ConfirmDialog
        open={leaveOpen}
        onClose={() => !busy && setLeaveOpen(false)}
        titleId="squad-leave-title"
        title="Leave this squad?"
        variant="warning"
        message="You will need to join again (or use an invite) to come back."
        confirmLabel="Leave"
        closeOnConfirm={false}
        loading={busy}
        onConfirm={() => void leave()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => !busy && setDeleteOpen(false)}
        titleId="squad-delete-title"
        title="Delete this squad?"
        message="This removes the squad, its member list, and squad shares. Blog posts stay published but are unlinked from this squad."
        confirmLabel="Delete squad"
        closeOnConfirm={false}
        loading={busy}
        onConfirm={() => void deleteSquadFn()}
      />

      <ConfirmDialog
        open={pinConfirm !== null}
        onClose={() => !pinBusy && setPinConfirm(null)}
        titleId="squad-feed-pin-confirm"
        title={pinConfirm?.mode === 'unpin' ? 'Unpin this post?' : 'Pin this post for the squad?'}
        variant="warning"
        message={
          pinConfirm?.mode === 'unpin'
            ? 'It will stay in the feed but no longer show the pinned label or pinned-only filter.'
            : 'Pinned posts are highlighted with a label and can be viewed together using the Pinned filter.'
        }
        confirmLabel={pinConfirm?.mode === 'unpin' ? 'Unpin' : 'Pin'}
        closeOnConfirm={false}
        loading={pinBusy}
        onConfirm={() => void confirmPinAction()}
      />
    </div>
  );
}
