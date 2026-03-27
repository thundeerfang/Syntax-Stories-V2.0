'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ExternalLink, Github, Instagram, Linkedin, Monitor, Users, Wrench, Youtube, UserPlus, Terminal, Activity, ChevronRight, Globe } from 'lucide-react';
import { followApi, type PublicProfileUser } from '@/api/follow';
import { analyticsApi } from '@/api/analytics';
import { useAuthStore } from '@/store/auth';
import { FollowersFollowingDialog, MediaFullViewDialog } from '@/components/profile/dialog';
import { cn } from '@/lib/utils';
import { STACK_AND_TOOLS_MAX } from '@/lib/stackAndToolsLimits';
import { toast } from 'sonner';
import { getSkillIconUrl } from '@/lib/skillIcons';
import { ProfileSectionAccordion, type ProfileSectionVariant } from '@/components/ui/ProfileSectionAccordion';
import { WorkExperienceCard } from '@/app/settings/settings-list/WorkExperienceCard';
import { EducationCard } from '@/app/settings/settings-list/EducationCard';
import { CertificationCard } from '@/app/settings/settings-list/CertificationCard';
import { ProjectCard } from '@/app/settings/settings-list/ProjectCard';
import { OpenSourceCard } from '@/app/settings/settings-list/OpenSourceCard';
import { SparkLottie, StreakFireLottie, WalletLottie } from '@/components/ui';
import { AreaChart } from '@/components/retroui';
import { ProfileHeatmap } from '@/components/profile/ProfileHeatmap';
import { HoverCard } from '@/components/ui/HoverCard';
import { LinkPreviewCardContent } from '@/components/ui/LinkPreviewCardContent';

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = typeof params?.username === 'string' ? params.username.trim().toLowerCase() : '';
  const { user: currentUser, token } = useAuthStore();
  const [profile, setProfile] = useState<PublicProfileUser | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mySetupPreview, setMySetupPreview] = useState<{ src: string; title: string } | null>(null);
  const [activityTab, setActivityTab] = useState<'posts' | 'repost'>('posts');

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }
    setLoading(true);
    followApi
      .getPublicProfile(username)
      .then((res) => {
        if (res.success) {
          setProfile(res.user);
          setFollowersCount(res.followersCount);
          setFollowingCount(res.followingCount);
        }
      })
      .catch(() => {
        toast.error('User not found');
        router.replace('/');
      })
      .finally(() => setLoading(false));
  }, [username, router]);

  useEffect(() => {
    if (!token || !username || !currentUser) return;
    followApi.checkFollowing(username, token).then((res) => setFollowing(res.following));
  }, [token, username, currentUser]);

  // Record profile view (best-effort; backend ignores self + dedupes by anon cookie)
  useEffect(() => {
    if (!username || !profile) return;
    // Do not count when owner views their own public profile
    if (currentUser?.username && currentUser.username.toLowerCase() === username.toLowerCase()) return;
    void analyticsApi.recordProfileView(username);
  }, [username, profile, currentUser?.username]);

  const handleFollowClick = async () => {
    if (!token || !username) {
      router.push('/login');
      return;
    }
    if (currentUser?.username?.toLowerCase() === username) return;
    setFollowLoading(true);
    try {
      if (following) {
        await followApi.unfollow(username, token);
        setFollowing(false);
        setFollowingCount((c) => Math.max(0, c - 1));
        toast.success('Unfollowed');
      } else {
        await followApi.follow(username, token);
        setFollowing(true);
        setFollowersCount((c) => c + 1);
        toast.success('Following');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setFollowLoading(false);
    }
  };

  const refreshCounts = () => {
    if (!username) return;
    followApi.getFollowCounts(username).then((res) => {
      if (res.success) {
        setFollowersCount(res.followersCount);
        setFollowingCount(res.followingCount);
      }
    }).catch(() => {});
  };

  function formatMonthYear(val: string): string {
    if (!val || val.length < 7) return '';
    const [y, m] = val.split('-');
    const monthNum = parseInt(m ?? '', 10);
    if (Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) return val;
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${MONTHS[monthNum - 1]} ${y}`;
  }

  function isImageUrl(url: string): boolean {
    return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);
  }

  function domainFromUrl(url: string): string {
    const u = (url ?? '').trim();
    if (!u) return '';
    try {
      const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
      return new URL(withProto).host;
    } catch {
      return u.replace(/^https?:\/\//i, '').split('/')[0] || u;
    }
  }

  function normalizeDomain(domain: string | undefined): string {
    if (!domain?.trim()) return '';
    const d = domain.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
    return d ? `https://${d}` : '';
  }

  function locationWithoutType(location: string | undefined): string {
    if (!location?.trim()) return '';
    return location.trim().replace(/\s*\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();
  }

  const profileProjects = useMemo(() => {
    const full = ((profile?.projects ?? []) as any[]);
    const isGithub = (p: unknown) => (p as { source?: string }).source === 'github';
    return {
      nonGithub: full.filter((p) => !isGithub(p)),
      github: full.filter(isGithub),
    };
  }, [profile?.projects]);

  const openSourceList = useMemo(() => {
    const fromProjects = profileProjects.github;
    const fromContributions = ((profile?.openSourceContributions ?? []) as any[]).map((c: any) => ({
      ...c,
      repoFullName: c.repoFullName ?? c.repository ?? c.repo ?? c.title,
      publicationUrl: c.publicationUrl ?? c.repositoryUrl ?? c.url,
    }));
    return [...fromProjects, ...fromContributions].slice(0, 7);
  }, [profileProjects.github, profile?.openSourceContributions]);

  const [openSectionId, setOpenSectionId] = useState<ProfileSectionVariant | null>('workExperience');
  const accordionsRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (ev: MouseEvent) => {
      if (!openSectionId) return;
      const root = accordionsRootRef.current;
      if (root && !root.contains(ev.target as Node)) setOpenSectionId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openSectionId]);

  const [visibleCounts, setVisibleCounts] = useState<Record<ProfileSectionVariant, number>>({
    workExperience: 1,
    education: 1,
    certification: 1,
    project: 1,
    openSource: 2,
    mySetup: 2,
  });
  const [sectionLoading, setSectionLoading] = useState<Record<ProfileSectionVariant, boolean>>({
    workExperience: false,
    education: false,
    certification: false,
    project: false,
    openSource: false,
    mySetup: false,
  });

  const setSectionOpen = (variant: ProfileSectionVariant, open: boolean) => {
    if (!open) {
      setOpenSectionId((prev) => (prev === variant ? null : prev));
      return;
    }
    setOpenSectionId(variant);
    setVisibleCounts((prev) => ({
      ...prev,
      [variant]:
        variant === 'openSource'
          ? Math.max(prev[variant] ?? 2, 2)
          : variant === 'mySetup'
            ? Math.max(prev[variant] ?? 2, 2)
            : Math.max(prev[variant] ?? 1, 1),
    }));
    setSectionLoading((prev) => ({ ...prev, [variant]: true }));
    window.setTimeout(() => setSectionLoading((prev) => ({ ...prev, [variant]: false })), 420);
  };

  const viewMore = (variant: ProfileSectionVariant, step = 1) => {
    setSectionLoading((prev) => ({ ...prev, [variant]: true }));
    window.setTimeout(() => {
      setVisibleCounts((prev) => ({ ...prev, [variant]: (prev[variant] ?? 0) + step }));
      setSectionLoading((prev) => ({ ...prev, [variant]: false }));
    }, 420);
  };

  const CardSkeleton = ({ lines = 3 }: { lines?: number }) => (
    <div className="border-2 border-border bg-muted/10 p-4 animate-pulse">
      <div className="h-4 w-40 bg-muted rounded" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 w-full bg-muted rounded" />
        ))}
        <div className="h-3 w-2/3 bg-muted rounded" />
      </div>
    </div>
  );

  const publicLinks = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      url: string;
      Icon: React.ComponentType<{ className?: string }>;
      iconBg: string;
      iconColor: string;
    }> = [];
    const add = (
      key: string,
      label: string,
      urlRaw: unknown,
      Icon: React.ComponentType<{ className?: string }>,
      iconBg: string,
      iconColor: string
    ) => {
      const url = typeof urlRaw === 'string' ? urlRaw.trim() : '';
      if (!url) return;
      const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      items.push({ key, label, url: withProto, Icon, iconBg, iconColor });
    };
    add('linkedin', 'LinkedIn', profile?.linkedin, Linkedin, 'bg-[#0A66C2]/10', 'text-[#0A66C2]');
    add('github', 'GitHub', profile?.github, Github, 'bg-foreground/10', 'text-foreground');
    add('instagram', 'Instagram', profile?.instagram, Instagram, 'bg-[#E4405F]/10', 'text-[#E4405F]');
    add('youtube', 'YouTube', profile?.youtube, Youtube, 'bg-[#FF0000]/10', 'text-[#FF0000]');
    return items;
  }, [profile?.github, profile?.instagram, profile?.linkedin, profile?.youtube]);

  const markdownToHtml = (raw: string) => {
    const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    let s = escape(raw || '');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_\n]+)__/g, '<u>$1</u>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    return s.replace(/\n/g, '<br>');
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-sm font-bold text-muted-foreground uppercase">Loading...</p>
      </div>
    );
  }

  const isSelf = currentUser?.username?.toLowerCase() === username;
  const stats = [
    { key: 'respect', label: 'Respect', value: 10, iconNode: <SparkLottie play size={24} /> },
    { key: 'wallet', label: 'Wallet', value: 0, iconNode: <WalletLottie play size={24} /> },
    { key: 'streak', label: 'Streak', value: 0, iconNode: <StreakFireLottie play size={24} /> },
    { key: 'followers', label: 'Followers', value: followersCount, iconNode: <Users className="size-4 text-primary" /> },
    { key: 'following', label: 'Following', value: followingCount, iconNode: <UserPlus className="size-4 text-primary" /> },
  ] as const;

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans text-foreground">
      <div className="mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl">
        <div className="lg:col-span-8 space-y-8">
          <section className="border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)] overflow-hidden">
            <div className="h-48 relative border-b-4 border-border overflow-hidden">
              {profile.coverBanner ? (
                <img src={profile.coverBanner} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full gradient-auto" />
              )}
            </div>

            <div className="px-6 pb-8 pt-24 md:pt-32 relative bg-card">
              <div className="absolute -top-14 left-6 size-28 md:size-36 border-4 border-border bg-muted shadow-[6px_6px_0px_0px_var(--primary)] overflow-hidden">
                <img
                  src={profile.profileImg || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter italic">{profile.fullName || profile.username}</h1>
                  <div className="text-primary font-bold flex items-center gap-2 mt-1 uppercase text-xs tracking-widest">
                    <span>@{profile.username}</span>
                    {profile?.portfolioUrl?.trim() ? (
                      <HoverCard
                        content={<LinkPreviewCardContent domain={profile.portfolioUrl} title="Portfolio" />}
                        side="top"
                        align="start"
                        contentClassName="w-[280px] p-0"
                      >
                        <a
                          href={profile.portfolioUrl.trim().startsWith('http') ? profile.portfolioUrl.trim() : `https://${profile.portfolioUrl.trim()}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open portfolio"
                          className="inline-flex items-center justify-center size-7 border-2 border-border bg-card text-foreground hover:bg-muted shadow-[2px_2px_0px_0px_var(--border)]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="size-4 text-primary" />
                        </a>
                      </HoverCard>
                    ) : null}
                  </div>
                </div>
                {isSelf ? null : token ? (
                  <button
                    type="button"
                    disabled={followLoading}
                    onClick={handleFollowClick}
                    className={cn(
                      'px-6 py-2.5 border-2 font-black text-[10px] uppercase tracking-widest shrink-0 shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none transition-all',
                      following ? 'border-border bg-card hover:bg-muted' : 'border-primary bg-primary text-primary-foreground'
                    )}
                  >
                    {followLoading ? '…' : following ? 'Following' : 'Follow'}
                  </button>
                ) : (
                  <Link
                    href={`/login?next=${encodeURIComponent(`/u/${params?.username ?? username}`)}`}
                    className={cn(
                      'inline-flex items-center justify-center px-6 py-2.5 border-2 font-black text-[10px] uppercase tracking-widest shrink-0 shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none transition-all',
                      'border-primary bg-primary text-primary-foreground hover:opacity-90'
                    )}
                  >
                    Follow
                  </Link>
                )}
              </div>

              {profile.bio?.trim() ? (
                <div className="mt-6 relative border-2 border-border bg-muted/5 p-6 pt-10 group">
                  <div className="absolute top-0 left-0 flex items-stretch">
                    <div className="bg-primary px-3 py-1.5 flex items-center gap-2">
                      <Terminal className="size-3 text-primary-foreground" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary-foreground">
                        Summary_Report
                      </span>
                    </div>
                    <div className="w-4 bg-primary" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 100%)' }} />
                  </div>

                  <div className="absolute top-2 right-4 text-[8px] font-mono text-muted-foreground/40 uppercase tracking-widest hidden sm:block">
                    REF_NO: {String(profile?.id ?? '').slice(-8) || '0000X-SYS'}
                  </div>

                  <div
                    className="text-sm text-foreground/80 font-medium leading-relaxed max-w-none
                      [&_strong]:text-primary [&_strong]:font-black [&_u]:decoration-primary/50 [&_em]:italic [&_em]:text-foreground"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(profile.bio) }}
                  />

                  <div className="absolute bottom-1 right-1 size-3 border-r-2 border-b-2 border-border/50" />
                </div>
              ) : (
                <div className="mt-6 border-2 border-dashed border-border p-8 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Biography_Data_Missing
                  </p>
                </div>
              )}

              {/* Stats bar (same placement as profile preview) */}
              <div className="flex flex-wrap gap-3 mt-8 p-4 border-4 border-border border-dashed bg-muted/5">
                {stats.map((s) => {
                  return (
                    <div key={s.key} className="flex items-center gap-2 pr-4 border-r-2 border-border/50 last:border-r-0 last:pr-0">
                      {s.iconNode}
                      <span className="font-black text-sm uppercase">{s.value}</span>
                      <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ACTIVITY (public): Posts + Repost */}
          <section className="space-y-4 border-4 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                <Activity className="size-4 text-primary" /> Activity
              </h2>
            </div>
            <div className="flex gap-1 border-b-4 border-border pb-3">
              {(['posts', 'repost'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActivityTab(tab)}
                  className={cn(
                    'flex-1 px-3 py-2 font-black text-[10px] uppercase tracking-widest border-2 border-border transition-all',
                    activityTab === tab
                      ? 'bg-primary text-primary-foreground border-primary shadow-[3px_3px_0px_0px_var(--border)]'
                      : 'bg-card hover:bg-muted text-muted-foreground'
                  )}
                >
                  {tab === 'posts' ? 'Posts' : 'Repost'}
                </button>
              ))}
            </div>
            <div className="border-4 border-border border-dashed p-10 bg-muted/5 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {activityTab === 'posts' ? 'No posts found.' : 'No reposts found.'}
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
              <div className="flex items-center justify-between px-2 mb-4">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <Monitor className="size-4 text-primary" /> Stack & Tools
                </h2>
              </div>
              {profile.stackAndTools?.length ? (
                <div className="flex flex-wrap gap-3 py-1">
                  {profile.stackAndTools.slice(0, STACK_AND_TOOLS_MAX).map((t, i) => {
                    const iconUrl = getSkillIconUrl(t);
                    return (
                      <div
                        key={i}
                        className="border-2 border-border bg-muted/10 px-3 py-2 shadow-[2px_2px_0px_0px_var(--border)] max-w-full"
                        title={t}
                      >
                        <div className="flex items-center gap-2">
                          <div className="size-7 shrink-0 flex items-center justify-center overflow-hidden">
                            {iconUrl ? (
                              <img src={iconUrl} alt={t} className="size-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <Monitor className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground break-words text-left">{t}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">No stack yet</p>
                </div>
              )}
            </section>

            <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
              <div className="flex items-center justify-between px-2 mb-4">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <Wrench className="size-4 text-primary" /> My Setup
                </h2>
              </div>
              {(profile as any)?.mySetup?.length ? (
                <div className="flex gap-3 overflow-x-auto ss-scrollbar-hide py-1 pr-1 snap-x">
                  {((profile as any).mySetup as Array<{ label: string; imageUrl: string; productUrl?: string }>).slice(0, 5).map((it, i) => (
                    <div key={`${it.imageUrl}-${i}`} className="snap-start shrink-0 w-[240px] border-2 border-border bg-muted/10 shadow-[2px_2px_0px_0px_var(--border)] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setMySetupPreview({ src: it.imageUrl, title: it.label })}
                        className="relative block h-28 w-full cursor-zoom-in border-b-2 border-border bg-muted/20 overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        aria-label={`View ${it.label} image larger`}
                      >
                        <img src={it.imageUrl} alt={it.label} className="h-full w-full object-cover transition-opacity hover:opacity-90" loading="lazy" />
                      </button>
                      <div className="p-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{it.label}</div>
                        {it.productUrl ? (
                          <HoverCard
                            content={<LinkPreviewCardContent domain={it.productUrl} title={it.label} />}
                            side="top"
                            align="start"
                            contentClassName="w-[280px] p-0"
                          >
                            <a
                              href={it.productUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-[10px] font-black uppercase text-primary hover:underline"
                            >
                              <ExternalLink className="size-3.5" /> Product
                            </a>
                          </HoverCard>
                        ) : (
                          <div className="mt-2 text-[10px] font-bold uppercase text-muted-foreground">No link</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">No setup yet</p>
                </div>
              )}
            </section>
          </div>

          <div ref={accordionsRootRef} className="space-y-6">
            <ProfileSectionAccordion
              variant="workExperience"
              open={openSectionId === 'workExperience'}
              onOpenChange={(open) => setSectionOpen('workExperience', open)}
              subtitle={profile.workExperiences?.length ? `${profile.workExperiences.length} ${profile.workExperiences.length === 1 ? 'entry' : 'entries'}` : undefined}
            >
              {profile.workExperiences?.length ? (
                <div className="space-y-4">
                  {sectionLoading.workExperience ? (
                    <CardSkeleton lines={4} />
                  ) : (
                    (profile.workExperiences as any[]).slice(0, visibleCounts.workExperience).map((e, i) => (
                      <WorkExperienceCard
                        key={i}
                        experience={e}
                        index={i}
                        saving={false}
                        onEdit={() => {}}
                        onRemove={() => {}}
                        onPreviewMedia={() => {}}
                        formatMonthYear={formatMonthYear}
                        locationWithoutType={locationWithoutType}
                        normalizeDomain={normalizeDomain}
                        isImageUrl={isImageUrl}
                        hideActions
                      />
                    ))
                  )}
                  {(profile.workExperiences as any[]).length > visibleCounts.workExperience ? (
                    <button
                      type="button"
                      disabled={sectionLoading.workExperience}
                      onClick={() => viewMore('workExperience', 1)}
                      className="w-full px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
                    >
                      {sectionLoading.workExperience ? 'LOADING…' : `View more (${visibleCounts.workExperience}/${(profile.workExperiences as any[]).length})`}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No work experience</p>
                </div>
              )}
            </ProfileSectionAccordion>

            <ProfileSectionAccordion
              variant="education"
              open={openSectionId === 'education'}
              onOpenChange={(open) => setSectionOpen('education', open)}
              subtitle={profile.education?.length ? `${profile.education.length} ${profile.education.length === 1 ? 'entry' : 'entries'}` : undefined}
            >
              {profile.education?.length ? (
                <div className="space-y-4">
                  {sectionLoading.education ? (
                    <CardSkeleton lines={3} />
                  ) : (
                    (profile.education as any[]).slice(0, visibleCounts.education).map((e, i) => (
                      <EducationCard
                        key={i}
                        education={e}
                        index={i}
                        saving={false}
                        onEdit={() => {}}
                        onRemove={() => {}}
                        formatMonthYear={formatMonthYear}
                        hideActions
                      />
                    ))
                  )}
                  {(profile.education as any[]).length > visibleCounts.education ? (
                    <button
                      type="button"
                      disabled={sectionLoading.education}
                      onClick={() => viewMore('education', 1)}
                      className="w-full px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
                    >
                      {sectionLoading.education ? 'LOADING…' : `View more (${visibleCounts.education}/${(profile.education as any[]).length})`}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No education</p>
                </div>
              )}
            </ProfileSectionAccordion>

            <ProfileSectionAccordion
              variant="certification"
              open={openSectionId === 'certification'}
              onOpenChange={(open) => setSectionOpen('certification', open)}
              subtitle={profile.certifications?.length ? `${profile.certifications.length} ${profile.certifications.length === 1 ? 'entry' : 'entries'}` : undefined}
            >
              {profile.certifications?.length ? (
                <div className="space-y-4">
                  {sectionLoading.certification ? (
                    <CardSkeleton lines={4} />
                  ) : (
                    (profile.certifications as any[]).slice(0, visibleCounts.certification).map((c, i) => (
                      <CertificationCard
                        key={i}
                        cert={c}
                        index={i}
                        saving={false}
                        onEdit={() => {}}
                        onRemove={() => {}}
                        onPreviewMedia={() => {}}
                        formatMonthYear={formatMonthYear}
                        domainFromUrl={domainFromUrl}
                        isImageUrl={isImageUrl}
                        hideActions
                      />
                    ))
                  )}
                  {(profile.certifications as any[]).length > visibleCounts.certification ? (
                    <button
                      type="button"
                      disabled={sectionLoading.certification}
                      onClick={() => viewMore('certification', 1)}
                      className="w-full px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
                    >
                      {sectionLoading.certification ? 'LOADING…' : `View more (${visibleCounts.certification}/${(profile.certifications as any[]).length})`}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No certifications</p>
                </div>
              )}
            </ProfileSectionAccordion>

            <ProfileSectionAccordion
              variant="project"
              open={openSectionId === 'project'}
              onOpenChange={(open) => setSectionOpen('project', open)}
              subtitle={profileProjects.nonGithub.length ? `${profileProjects.nonGithub.length} ${profileProjects.nonGithub.length === 1 ? 'entry' : 'entries'}` : undefined}
            >
              {profileProjects.nonGithub.length ? (
                <div className="space-y-4">
                  {sectionLoading.project ? (
                    <CardSkeleton lines={4} />
                  ) : (
                    profileProjects.nonGithub.slice(0, visibleCounts.project).map((p, i) => (
                      <ProjectCard
                        key={i}
                        project={p}
                        index={i}
                        saving={false}
                        onEdit={() => {}}
                        onRemove={() => {}}
                        onPreviewMedia={() => {}}
                        formatMonthYear={formatMonthYear}
                        domainFromUrl={domainFromUrl}
                        isImageUrl={isImageUrl}
                        hideActions
                      />
                    ))
                  )}
                  {profileProjects.nonGithub.length > visibleCounts.project ? (
                    <button
                      type="button"
                      disabled={sectionLoading.project}
                      onClick={() => viewMore('project', 1)}
                      className="w-full px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
                    >
                      {sectionLoading.project ? 'LOADING…' : `View more (${visibleCounts.project}/${profileProjects.nonGithub.length})`}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No projects</p>
                </div>
              )}
            </ProfileSectionAccordion>

            <ProfileSectionAccordion
              variant="openSource"
              open={openSectionId === 'openSource'}
              onOpenChange={(open) => setSectionOpen('openSource', open)}
              subtitle={openSourceList.length ? `${openSourceList.length} ${openSourceList.length === 1 ? 'repo' : 'repos'}` : undefined}
            >
              {openSourceList.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sectionLoading.openSource ? (
                    <>
                      <CardSkeleton lines={3} />
                      <CardSkeleton lines={3} />
                    </>
                  ) : (
                    openSourceList.slice(0, visibleCounts.openSource).map((item, i) => (
                      <OpenSourceCard
                        key={(item as { repoFullName?: string }).repoFullName ?? i}
                        item={item}
                        index={i}
                        saving={false}
                        onOpen={() => {
                          const url = (item as any).publicationUrl ?? (item as any).url ?? (item as any).repositoryUrl;
                          if (url) window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        onDetach={() => {}}
                        hideActions
                      />
                    ))
                  )}

                  {openSourceList.length > visibleCounts.openSource ? (
                    <div className="md:col-span-2 pt-1">
                      <button
                        type="button"
                        disabled={sectionLoading.openSource}
                        onClick={() => viewMore('openSource', 2)}
                        className="w-full px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40 disabled:opacity-50"
                      >
                        {sectionLoading.openSource ? 'LOADING…' : `View more (${Math.min(visibleCounts.openSource, openSourceList.length)}/${openSourceList.length})`}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No open source</p>
                </div>
              )}
            </ProfileSectionAccordion>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 border-2 border-border bg-muted/50 flex items-center justify-center">
                  <Users className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase">Followers & Following</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">
                    {followersCount} followers · {followingCount} following
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                aria-label="Open followers and following"
                className="p-2 border-2 border-border bg-card hover:bg-muted shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all shrink-0"
              >
                <ChevronRight className="size-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* ACHIEVEMENTS */}
          <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <SparkLottie play size={18} /> Achievements
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black italic">0/0</span>
              <span className="text-[9px] font-black text-muted-foreground uppercase">Coming soon</span>
            </div>
            <div className="h-2 bg-muted border-2 border-border mt-3">
              <div className="h-full bg-primary" style={{ width: '0%' }} />
            </div>
          </div>

          {/* BADGES */}
          <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest">Badges & Awards</h3>
              <span className="text-[9px] font-black text-muted-foreground uppercase">Coming soon</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b-2 border-border border-dashed">
                <span className="text-[9px] font-bold uppercase text-muted-foreground">Top reader badge</span>
                <span className="text-xs font-black">x0</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[9px] font-bold uppercase text-muted-foreground">Total Awards</span>
                <span className="text-xs font-black">x0</span>
              </div>
            </div>
          </div>

          {publicLinks.length > 0 ? (
            <div className="border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center border-2 border-border bg-muted/30">
                  <ExternalLink className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Public Links</h3>
                  <p className="text-[9px] font-medium text-muted-foreground/80">
                    Explore this creator&apos;s social profiles.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {publicLinks.map((l) => {
                  const Icon = l.Icon;

                  return (
                    <HoverCard
                      key={l.key}
                      content={<LinkPreviewCardContent domain={l.url} title={l.label} />}
                      side="top"
                      align="start"
                      contentClassName="w-[280px] p-0"
                    >
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={l.label}
                        className={cn(
                          'size-11 border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border)]',
                          'bg-card hover:bg-muted/30 transition-colors'
                        )}
                        title={l.label}
                      >
                        <span className={cn('size-9 border-2 border-border flex items-center justify-center', l.iconBg, l.iconColor)}>
                          <Icon className="size-4" />
                        </span>
                      </a>
                    </HoverCard>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* PERFORMANCE-LIKE CARD (public) moved to end */}
          <div className="border-4 border-border bg-card p-5 shadow-[8px_8px_0px_0px_var(--border)] space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Monitor className="size-4 text-primary" /> Creator Telemetry
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                <div className="text-lg font-black italic flex items-center gap-2">
                  0 <StreakFireLottie play size={28} />
                </div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">Total streak</p>
              </div>
              <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                <p className="text-lg font-black italic">0</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">Total posts</p>
              </div>
              <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                <p className="text-lg font-black italic">0</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">Total views</p>
              </div>
              <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                <p className="text-lg font-black italic">0</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">Reposted posts</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-row items-stretch min-h-0 p-3 border-2 border-border bg-muted/5 shadow-[2px_2px_0px_0px_var(--border)]">
                <div className="flex flex-col justify-center shrink-0 pr-4 text-left">
                  <p className="text-lg font-black italic leading-none">0</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">Views this week</p>
                </div>
                <div className="flex-1 min-w-0 h-14 overflow-hidden flex items-center">
                  <AreaChart
                    data={[
                      { name: 'M', views: 0 },
                      { name: 'T', views: 0 },
                      { name: 'W', views: 0 },
                      { name: 'T', views: 0 },
                      { name: 'F', views: 0 },
                      { name: 'S', views: 0 },
                      { name: 'S', views: 0 },
                    ]}
                    index="name"
                    categories={['views']}
                    height={56}
                    sparkline
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <p className="text-[9px] font-black uppercase text-muted-foreground">Contribution Heatmap</p>
              <div className="overflow-x-auto ss-scrollbar-hide border-2 border-border p-2 bg-muted/5">
                <div className="min-w-[400px]">
                  <ProfileHeatmap />
                </div>
              </div>
            </div>
          </div>
        </div>

        <FollowersFollowingDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          username={username}
          currentUserUsername={currentUser?.username ?? null}
          token={token}
          followersCount={followersCount}
          followingCount={followingCount}
          onFollowChange={refreshCounts}
        />
        <MediaFullViewDialog
          open={!!mySetupPreview}
          onClose={() => setMySetupPreview(null)}
          src={mySetupPreview?.src ?? ''}
          title={mySetupPreview?.title}
          altText={mySetupPreview?.title}
        />
      </div>
    </div>
  );
}
