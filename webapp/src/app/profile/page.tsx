'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Edit3,
  Plus,
  FileText,
  Monitor,
  Users,
  Award,
  Github,
  Linkedin,
  Instagram,
  Youtube,
  Eye,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Code2,
  TrendingUp,
  Copy,
  Check,
  ChevronRight,
  Activity,
  PenSquare,
  BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Switch, AreaChart } from '@/components/retroui';
import { useSidebar } from '@/hooks/useSidebar';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuthStore } from '@/store/auth';
import { WalletLottie, SparkLottie, StreakFireLottie } from '@/components/ui';
import { ProfileHeatmap } from '@/components/profile/ProfileHeatmap';
import { FollowersFollowingDialog } from '@/components/profile/dialog';
import { getSkillIconUrl } from '@/lib/skillIcons';
import { TerminalLoaderPage } from '@/components/loader';

function formatJoinedDate(createdAt: string | undefined): string {
  if (!createdAt) return '';
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

type ActivityTab = 'posts' | 'replies' | 'upvoted';

export default function ProfilePage() {
  const router = useRouter();
  const { isOpen } = useSidebar();
  const { user, token, isHydrated, shouldBlock } = useRequireAuth();
  const [activityTab, setActivityTab] = useState<ActivityTab>('posts');
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [profileUrlCopied, setProfileUrlCopied] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const publicProfileUrl = useMemo(() => {
    if (typeof window === 'undefined' || !user?.username) return '';
    return `${window.location.origin}/u/${user.username}`;
  }, [user?.username]);

  const copyProfileUrl = async () => {
    const url = publicProfileUrl || (typeof window !== 'undefined' ? window.location.origin + '/profile' : '');
    try {
      await navigator.clipboard.writeText(url);
      setProfileUrlCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setProfileUrlCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const joinedLabel = useMemo(() => {
    const str = formatJoinedDate(user?.createdAt);
    return str ? `Joined ${str}` : '';
  }, [user?.createdAt]);

  if (!isHydrated || shouldBlock) {
    return <TerminalLoaderPage pageName="profile" />;
  }

  // Reusable Section Header (hide Add button in preview mode)
  const SectionHeader = ({ icon: Icon, title, showAdd = true }: { icon: any; title: string; showAdd?: boolean }) => (
    <div className="flex items-center justify-between px-2 mb-4">
      <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      {showAdd && !isPreviewMode && (
        <button className="text-[10px] font-black uppercase flex items-center gap-1 hover:text-primary transition-colors border-2 border-border px-2 py-0.5 bg-card shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 transition-all">
          <Plus className="size-3" /> Add
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans text-foreground ">
      <div className={cn('mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8', isOpen ? 'max-w-6xl' : 'max-w-7xl')}>
        
        {/* ================= LEFT COLUMN ================= */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* HEADER SECTION */}
          <section className="border-4 border-border bg-card shadow-[8px_8px_0px_0px_var(--border)] overflow-hidden">
            {/* Cover: user cover or gradient */}
            <div className="h-48 relative border-b-4 border-border overflow-hidden">
              {user?.coverBanner ? (
                <img src={user.coverBanner} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full gradient-auto" />
              )}
            </div>

            <div className="px-6 pb-8 pt-24 md:pt-32 relative bg-card">
              <div className="absolute -top-14 left-6 size-28 md:size-36 border-4 border-border bg-muted shadow-[6px_6px_0px_0px_var(--primary)] overflow-hidden">
                <img
                  src={user?.profileImg || user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter italic">{user?.fullName || user?.name || 'Profile'}</h1>
                  <p className="text-primary font-bold flex items-center gap-2 mt-1 uppercase text-xs tracking-widest">
                    {user?.username ? `@${user.username}` : ''}
                    {joinedLabel && (
                      <>
                        <span className="size-1.5 bg-border rounded-full" /> {joinedLabel}
                      </>
                    )}
                  </p>
                </div>
                {!isPreviewMode && (
                  <div className="flex gap-3">
                    <Link href="/settings" className="flex items-center gap-2 px-4 py-2 border-2 border-border bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--border)] active:shadow-none transition-all">
                      <Edit3 className="size-3.5" /> Edit Profile
                    </Link>
                  </div>
                )}
              </div>

              {/* Stats Bar */}
              <div className="flex flex-wrap gap-6 mt-8 p-4 border-4 border-gray-300 dark:border-border border-dashed bg-muted/5">
                <div className="flex items-center gap-2">
                  <SparkLottie play size={24} />
                  <span className="font-black text-sm uppercase">10</span>
                  <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">Respect</span>
                </div>
                <div className="flex items-center gap-2">
                  <WalletLottie play size={24} />
                  <span className="font-black text-sm uppercase">0</span>
                  <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">Wallet</span>
                </div>
                <div className="flex items-center gap-2">
                  <StreakFireLottie play size={24} />
                  <span className="font-black text-sm uppercase">0</span>
                  <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">Streak</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <span className="font-black text-sm uppercase">0</span>
                  <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">Followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <span className="font-black text-sm uppercase">0</span>
                  <span className="font-bold text-[9px] text-muted-foreground uppercase tracking-widest">Following</span>
                </div>
              </div>
            </div>
          </section>

          {/* ACTIVITY TABS */}
          <section className="space-y-4 border-4 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                <Activity className="size-4 text-primary" /> Activity
              </h2>
              {!isPreviewMode && (
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 border-2 border-border bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-[3px_3px_0px_0px_var(--border)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  <PenSquare className="size-3.5" /> Add post
                </button>
              )}
            </div>
            <div className="flex gap-1 border-b-4 border-border pb-3">
              {(['posts', 'replies', 'upvoted'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActivityTab(tab)}
                  className={cn(
                    'flex-1 px-3 py-2 font-black text-[10px] uppercase tracking-widest border-2 border-border transition-all',
                    activityTab === tab
                      ? 'bg-primary text-primary-foreground border-primary shadow-[3px_3px_0px_0px_var(--border)]'
                      : 'bg-card hover:bg-muted text-muted-foreground'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="border-4 border-border border-dashed p-10 bg-muted/5 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                No posts found. Your activity will appear here.
              </p>
            </div>
          </section>

          {/* AUTOFILL - hidden in preview (owner-only) */}
          {!isPreviewMode && (
          <div className="border-4 border-border bg-primary p-6 flex flex-col md:flex-row items-center gap-6 shadow-[8px_8px_0px_0px_var(--border)]">
            <div className="size-16 bg-white border-4 border-border flex items-center justify-center shrink-0 -rotate-3">
              <FileText className="size-8 text-primary" />
            </div>
            <div className="flex-1 space-y-1 text-center md:text-left">
              <h3 className="text-lg font-black uppercase tracking-tight text-primary-foreground">Autofill your profile!</h3>
              <p className="text-xs font-bold text-primary-foreground/80 uppercase">Import details directly from your CV in seconds.</p>
            </div>
            <button className="px-6 py-3 bg-white text-black border-4 border-border font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--border)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
              Upload PDF
            </button>
          </div>
          )}

          {/* DYNAMIC SECTIONS — data from backend */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
              <SectionHeader icon={Monitor} title="Stack & Tools" />
              {user?.stackAndTools?.length ? (
                <div className="flex flex-wrap gap-4 items-center">
                  {user.stackAndTools.map((t, i) => {
                    const iconUrl = getSkillIconUrl(t);
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5" title={t}>
                        {iconUrl && (
                          <img
                            src={iconUrl}
                            alt={t}
                            className="w-14 h-14 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">{t}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Add your tech stack</p>
                  {!isPreviewMode && (
                    <Link href="/settings" className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                      <Plus className="size-3" /> Add
                    </Link>
                  )}
                </div>
              )}
            </section>
            <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
              <SectionHeader icon={Monitor} title="My Setup" />
              {user?.mySetup ? (
                <p className="text-sm font-medium whitespace-pre-wrap">{user.mySetup}</p>
              ) : (
                <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Share your setup</p>
                  {!isPreviewMode && (
                    <Link href="/settings" className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                      <Plus className="size-3" /> Add
                    </Link>
                  )}
                </div>
              )}
            </section>
          </div>

          <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
            <SectionHeader icon={Briefcase} title="Work Experiences" />
            {user?.workExperiences?.length ? (
              <ul className="space-y-3">
                {user.workExperiences.map((w, i) => (
                  <li key={i} className="p-3 border-2 border-border bg-muted/5">
                    <p className="font-bold text-sm">{w.role}{w.company ? ` at ${w.company}` : ''}</p>
                    {(w.startDate || w.endDate) && (
                      <p className="text-[10px] text-muted-foreground uppercase">{[w.startDate, w.endDate].filter(Boolean).join(' – ')}</p>
                    )}
                    {w.description && <p className="text-xs mt-1 text-muted-foreground">{w.description}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add work experience</p>
                {!isPreviewMode && (
                  <Link href="/settings" className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                    <Plus className="size-3" /> Add
                  </Link>
                )}
              </div>
            )}
          </section>

          <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
            <SectionHeader icon={GraduationCap} title="Education" />
            {user?.education?.length ? (
              <ul className="space-y-3">
                {user.education.map((e, i) => (
                  <li key={i} className="p-3 border-2 border-border bg-muted/5">
                    <p className="font-bold text-sm">{e.school}</p>
                    {(e.degree || e.field) && (
                      <p className="text-[10px] text-muted-foreground uppercase">{[e.degree, e.field].filter(Boolean).join(' · ')}</p>
                    )}
                    {(e.startYear || e.endYear) && (
                      <p className="text-[10px] text-muted-foreground">{[e.startYear, e.endYear].filter(Boolean).join(' – ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add education</p>
                {!isPreviewMode && (
                  <Link href="/settings" className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                    <Plus className="size-3" /> Add
                  </Link>
                )}
              </div>
            )}
          </section>

          <section className="space-y-4 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
            <SectionHeader icon={FolderGit2} title="Projects" />
            {user?.projects?.length ? (
              <ul className="space-y-3">
                {user.projects.map((p, i) => (
                  <li key={i} className="p-3 border-2 border-border bg-muted/5">
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-bold text-sm text-primary hover:underline">{p.name}</a>
                    ) : (
                      <p className="font-bold text-sm">{p.name}</p>
                    )}
                    {p.description && <p className="text-xs mt-1 text-muted-foreground">{p.description}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border-2 border-border border-dashed p-8 text-center bg-muted/5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add your projects</p>
                {!isPreviewMode && (
                  <Link href="/settings" className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                    <Plus className="size-3" /> Add
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* OPEN SOURCE */}
          <section className="border-4 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row items-start gap-6">
              <div className="size-14 border-4 border-border flex items-center justify-center shrink-0 bg-primary/10">
                <Code2 className="size-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-black uppercase tracking-widest">Open Source</h2>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Contribute and share your open source work.</p>
                {user?.openSourceContributions?.length ? (
                  <ul className="mt-3 space-y-2">
                    {user.openSourceContributions.map((c, i) => (
                      <li key={i} className="p-2 border-2 border-border bg-muted/5">
                        {c.repo && <p className="font-bold text-xs">{c.repo}</p>}
                        {c.description && <p className="text-[10px] text-muted-foreground">{c.description}</p>}
                        {c.url && (
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary hover:underline">View</a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <p className="text-[10px] font-bold text-muted-foreground mt-2">Add contributions</p>
                    {!isPreviewMode && (
                      <Link href="/settings" className="inline-flex items-center gap-1 mt-2 text-[10px] font-black text-primary uppercase hover:underline">
                        <Plus className="size-3" /> Add contribution
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. PREVIEW MODE */}
          <div className="border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 border-2 border-border bg-muted flex items-center justify-center shadow-[2px_2px_0px_0px_var(--border)]">
                <Eye className="size-4" />
              </div>
              <div>
                <h3 className="text-[10px] font-black uppercase">Preview Mode</h3>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Public View</p>
              </div>
            </div>
            <Switch checked={isPreviewMode} onCheckedChange={setIsPreviewMode} />
          </div>

          {/* 2. FOLLOWERS / FOLLOWING CARD */}
          <div className="border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 border-2 border-border bg-muted/50 flex items-center justify-center">
                  <Users className="size-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase">Followers & Following</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">
                    0 followers · 0 following
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFollowersDialogOpen(true)}
                aria-label="Open followers and following"
                className="p-2 border-2 border-border bg-card hover:bg-muted shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <ChevronRight className="size-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* 3. PUBLIC PROFILE URL + SOCIAL LINKS — from backend */}
          {!isPreviewMode && (
          <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)] space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest">Public Profile</h3>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Your profile link. Copy or share.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyProfileUrl}
                className="flex-1 min-w-0 flex items-center justify-between gap-2 bg-muted/30 border-2 border-border p-3 hover:bg-muted/50 transition-colors text-left group"
              >
                <span className="text-[10px] font-bold truncate text-foreground">
                  {publicProfileUrl || (typeof window !== 'undefined' ? `${window.location.origin}/profile` : '/profile')}
                </span>
                <span className={cn(
                  'shrink-0 flex items-center gap-1.5 px-2 py-1 border-2 border-border text-[9px] font-black uppercase',
                  profileUrlCopied ? 'bg-primary text-primary-foreground border-primary' : 'bg-card group-hover:border-primary'
                )}>
                  {profileUrlCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {profileUrlCopied ? 'Copied' : 'Copy'}
                </span>
              </button>
            </div>
            <div className="flex gap-3 items-center justify-center pt-1 flex-wrap">
              {user?.linkedin && (
                <a href={user.linkedin.startsWith('http') ? user.linkedin : `https://${user.linkedin}`} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="p-2 border-2 border-border bg-muted/30 hover:bg-muted/60 hover:border-primary transition-colors">
                  <Linkedin className="size-4 text-foreground" />
                </a>
              )}
              {user?.github && (
                <a href={user.github.startsWith('http') ? user.github : `https://${user.github}`} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="p-2 border-2 border-border bg-muted/30 hover:bg-muted/60 hover:border-primary transition-colors">
                  <Github className="size-4 text-foreground" />
                </a>
              )}
              {user?.instagram && (
                <a href={user.instagram.startsWith('http') ? user.instagram : `https://${user.instagram}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-2 border-2 border-border bg-muted/30 hover:bg-muted/60 hover:border-primary transition-colors">
                  <Instagram className="size-4 text-foreground" />
                </a>
              )}
              {user?.youtube && (
                <a href={user.youtube.startsWith('http') ? user.youtube : `https://${user.youtube}`} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="p-2 border-2 border-border bg-muted/30 hover:bg-muted/60 hover:border-primary transition-colors">
                  <Youtube className="size-4 text-foreground" />
                </a>
              )}
            </div>
          </div>
          )}

          <FollowersFollowingDialog
            open={followersDialogOpen}
            onClose={() => setFollowersDialogOpen(false)}
            followersCount={0}
            followingCount={0}
          />

          {/* 3. PROFILE ACTIVITY - Text left, graph right, reduced height */}
          <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                Profile Activity <span className="size-4 bg-muted text-[8px] flex items-center justify-center border-2 border-border">?</span>
              </h3>
              {!isPreviewMode && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-border bg-card font-black text-[9px] uppercase tracking-widest hover:bg-muted hover:border-primary transition-colors shadow-[2px_2px_0px_0px_var(--border)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  <BarChart2 className="size-3.5" /> Detailed analysis
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex flex-row items-stretch min-h-0 p-3 border-2 border-border bg-muted/5 shadow-[2px_2px_0px_0px_var(--border)]">
                <div className="flex flex-col justify-center shrink-0 pr-4 text-left">
                  <p className="text-lg font-black italic leading-none">1</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">Views this week</p>
                  <p className="text-[9px] font-black mt-0.5 text-primary">+5%</p>
                </div>
                <div className="flex-1 min-w-0 h-14 overflow-hidden flex items-center">
                  <AreaChart
                    data={[
                      { name: 'M', views: 2 },
                      { name: 'T', views: 4 },
                      { name: 'W', views: 3 },
                      { name: 'T', views: 5 },
                      { name: 'F', views: 4 },
                      { name: 'S', views: 6 },
                      { name: 'S', views: 1 },
                    ]}
                    index="name"
                    categories={['views']}
                    height={56}
                    sparkline
                  />
                </div>
              </div>
              <div className="flex flex-row items-stretch min-h-0 p-3 border-2 border-border bg-muted/5 shadow-[2px_2px_0px_0px_var(--border)]">
                <div className="flex flex-col justify-center shrink-0 pr-4 text-left">
                  <p className="text-lg font-black italic leading-none">1</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">Views this month</p>
                  <p className="text-[9px] font-black mt-0.5 text-primary">+12%</p>
                </div>
                <div className="flex-1 min-w-0 h-14 overflow-hidden flex items-center">
                  <AreaChart
                    data={[
                      { name: 'W1', views: 3 },
                      { name: 'W2', views: 5 },
                      { name: 'W3', views: 4 },
                      { name: 'W4', views: 6 },
                    ]}
                    index="name"
                    categories={['views']}
                    height={56}
                    sparkline
                  />
                </div>
              </div>
              <div className="flex flex-row items-stretch min-h-0 p-3 border-2 border-border bg-muted/5 shadow-[2px_2px_0px_0px_var(--border)]">
                <div className="flex flex-col justify-center shrink-0 pr-4 text-left">
                  <p className="text-lg font-black italic leading-none">1</p>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">Total profile views</p>
                  <p className="text-[9px] font-black mt-0.5 text-primary">+8%</p>
                </div>
                <div className="flex-1 min-w-0 h-14 overflow-hidden flex items-center">
                  <AreaChart
                    data={[
                      { name: 'Jan', views: 2 },
                      { name: 'Feb', views: 4 },
                      { name: 'Mar', views: 3 },
                      { name: 'Apr', views: 5 },
                      { name: 'May', views: 6 },
                      { name: 'Jun', views: 1 },
                    ]}
                    index="name"
                    categories={['views']}
                    height={56}
                    sparkline
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. PERFORMANCE & READING OVERVIEW - Stats restored */}
          <div className="border-4 border-border bg-card p-5 shadow-[8px_8px_0px_0px_var(--border)] space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" /> Performance
              </h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                <div className="text-lg font-black italic flex items-center gap-2">
                  1 <StreakFireLottie play size={28} />
                </div>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">Longest streak</p>
              </div>
              <div className="space-y-1 p-2 border-2 border-border bg-muted/10">
                <p className="text-lg font-black italic">3</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase">Total reading days</p>
              </div>
            </div>

            {/* Tags bars */}
            <div className="space-y-3">
              <p className="text-[9px] font-black uppercase text-muted-foreground">Top tags</p>
              {[
                { tag: 'AI', pct: '80%', val: '+50%' },
                { tag: 'React', pct: '45%', val: '+20%' },
              ].map((item) => (
                <div key={item.tag} className="space-y-1">
                  <div className="flex justify-between text-[8px] font-black uppercase">
                    <span>{item.tag}</span>
                    <span>{item.val}</span>
                  </div>
                  <div className="h-2.5 bg-muted border-2 border-border">
                    <div className="h-full bg-primary" style={{ width: item.pct }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Activity Grid: Posts, Replies, Upvoted counts Restored */}
            <div className="space-y-3 pt-2">
              <p className="text-[9px] font-black uppercase text-muted-foreground">Activity Summary</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 border-2 border-border bg-card text-center shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-sm font-black italic">0</p>
                  <p className="text-[7px] font-bold uppercase text-muted-foreground">Posts</p>
                </div>
                <div className="p-2 border-2 border-border bg-card text-center shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-sm font-black italic">0</p>
                  <p className="text-[7px] font-bold uppercase text-muted-foreground">Replies</p>
                </div>
                <div className="p-2 border-2 border-border bg-card text-center shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-sm font-black italic">0</p>
                  <p className="text-[7px] font-bold uppercase text-muted-foreground">Upvoted</p>
                </div>
              </div>
            </div>

            {/* Heatmap with hidden scrollbar restored */}
            <div className="pt-2 space-y-2">
              <p className="text-[9px] font-black uppercase text-muted-foreground">Contribution Heatmap</p>
              <div className="overflow-x-auto hide-scrollbar border-2 border-border p-2 bg-muted/5">
                <div className="min-w-[400px]">
                  <ProfileHeatmap />
                </div>
              </div>
            </div>
          </div>

          {/* 5. ACHIEVEMENTS restored */}
          <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
               <Award className="size-4 text-primary" /> Achievements
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black italic">1/56</span>
              <Link href="/achievements" className="text-[9px] font-black text-primary uppercase hover:underline">
                View all
              </Link>
            </div>
            <div className="h-2 bg-muted border-2 border-border mt-3">
              <div className="h-full bg-primary" style={{ width: '2%' }} />
            </div>
          </div>

          {/* 6. BADGES & AWARDS restored */}
          <div className="border-4 border-border bg-card p-5 shadow-[4px_4px_0px_0px_var(--border)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest">Badges & Awards</h3>
              <span className="text-[9px] font-black text-primary uppercase cursor-pointer hover:underline">Learn more</span>
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

        </div>
      </div>
    </div>
  );
}