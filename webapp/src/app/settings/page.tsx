'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  CreditCard,
  Briefcase,
  GraduationCap,
  Award,
  Eye,
  Bell,
  UserPlus,
  MoreHorizontal,
  Tag,
  Rss,
  SlidersHorizontal,
  Sparkles,
  ShieldOff,
  Flame,
  Plug,
  Key,
  ShieldCheck,
  Star,
  Megaphone,
  Smartphone,
  FileText,
  HeadphonesIcon,
  LogOut,
  Camera,
  Code2,
  FolderGit2,
  Settings,
  Building,
  Wallet,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/hooks/useSidebar';

type SectionId = string;

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Profile & Preferences',
    items: [
      { id: 'edit-profile', label: 'Edit profile', icon: User },
      { id: 'syntax-card', label: 'Syntax card', icon: CreditCard },
      { id: 'account', label: 'Account settings', icon: Settings },
      { id: 'job-preferences', label: 'Job preferences', icon: Briefcase },
      { id: 'achievements', label: 'Achievements', icon: Award },
      { id: 'syntax-wallet', label: 'Syntax Wallet', icon: Wallet },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'feed-general', label: 'Feed Settings', icon: SlidersHorizontal },
      { id: 'feed-ai', label: 'AI Superpowers', icon: Sparkles },
    ],
  },
  {
    heading: 'Career',
    items: [
      { id: 'education', label: 'Education', icon: GraduationCap },
      { id: 'certifications', label: 'Certifications', icon: Award },
      { id: 'open-source', label: 'Open Source', icon: Code2 },
      { id: 'projects', label: 'Projects & Publications', icon: FolderGit2 },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
      { id: 'organizations', label: 'Organizations', icon: Building },
    ],
  },
  {
    heading: 'Technical',
    items: [
      { id: 'integrations', label: 'Integrations', icon: Plug },
      { id: 'api-access', label: 'API Access', icon: Key },
      { id: 'devcard', label: 'DevCard', icon: CreditCard },
    ],
  },
  {
    heading: 'Support',
    items: [
      { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
      { id: 'docs', label: 'Documentation', icon: FileText },
      { id: 'support', label: 'Help Center', icon: HeadphonesIcon },
    ],
  },
];

const accordionVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: 'auto', opacity: 1 },
};

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4 pt-6 border-t-2 border-border/50 first:border-t-0 first:pt-0">
    <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
    <div className="grid gap-4">{children}</div>
  </div>
);

function SyntaxCardContent() {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-black uppercase tracking-tight">Syntax DevCard</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Your developer identity card. This is how you appear across the platform.
        </p>
      </header>

      <div className="max-w-md mx-auto lg:mx-0">
        <div className="relative group">
          {/* Decorative Background Shadow */}
          <div className="absolute inset-0 translate-x-2 translate-y-2 bg-primary border-2 border-black" />
          
          {/* Main Card */}
          <div className="relative border-2 border-black bg-white p-6 transition-transform group-hover:-translate-y-1">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="size-16 border-2 border-black bg-muted overflow-hidden">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Harshit"
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase">Harshit Kushwah</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">@harshitkushwah</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border-2 border-black bg-muted/30 py-3">
                  <p className="text-xl font-black italic leading-none">10</p>
                  <p className="mt-1 text-[8px] font-black uppercase text-muted-foreground">Rep</p>
                </div>
                <div className="border-2 border-black bg-muted/30 py-3">
                  <p className="text-xl font-black italic leading-none">2</p>
                  <p className="mt-1 text-[8px] font-black uppercase text-muted-foreground">Streak</p>
                </div>
                <div className="border-2 border-black bg-muted/30 py-3">
                  <p className="text-xl font-black italic leading-none">7</p>
                  <p className="mt-1 text-[8px] font-black uppercase text-muted-foreground">Reads</p>
                </div>
              </div>

           
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditProfileContent() {
  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-2xl font-black uppercase tracking-tight">Edit Profile</h2>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Manage your public presence and personal information.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest">Cover image</label>
          <div className="group relative h-32 border-2 border-border border-dashed bg-muted/20 hover:bg-muted/30 transition-colors flex items-center justify-center overflow-hidden">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-card border-2 border-border font-bold text-[10px] uppercase shadow-[2px_2px_0px_0px_var(--border)] active:translate-y-0.5 active:shadow-none transition-all">
              <Camera className="size-3" /> Change Cover
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest">Profile Photo</label>
          <div className="flex items-center gap-4">
            <div className="size-20 border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] bg-muted">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Harshit" alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <button className="px-3 py-1.5 border-2 border-border font-bold text-[10px] uppercase shadow-[2px_2px_0px_0px_var(--border)] active:translate-y-0.5 active:shadow-none transition-all">
              Change Photo
            </button>
          </div>
        </div>
      </div>

      <FormSection title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Full Name</label>
            <input type="text" defaultValue="Harshit Kushwah" className="w-full p-2.5 border-2 border-border bg-background focus:ring-0 focus:border-primary outline-none font-bold text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Username</label>
            <input type="text" defaultValue="harshitkushwah" className="w-full p-2.5 border-2 border-border bg-background focus:ring-0 focus:border-primary outline-none font-bold text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-muted-foreground">Short Bio</label>
          <textarea rows={3} placeholder="Tell the world what you're building..." className="w-full p-2.5 border-2 border-border bg-background focus:ring-0 focus:border-primary outline-none font-bold text-sm resize-none" />
        </div>
      </FormSection>

      <FormSection title="Links & Social">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Portfolio Website</label>
            <input type="url" placeholder="https://" className="w-full p-2.5 border-2 border-border bg-background font-bold text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Location</label>
            <input type="text" placeholder="Remote / City, Country" className="w-full p-2.5 border-2 border-border bg-background font-bold text-sm" />
          </div>
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-3 pt-6">
        <button className="px-6 py-2.5 font-black text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          Discard
        </button>
        <button className="px-8 py-2.5 bg-primary text-primary-foreground border-2 border-border font-black text-[11px] uppercase tracking-widest shadow-[4px_4px_0px_0px_var(--border)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
          Save Changes
        </button>
      </div>
    </div>
  );
}

function SkeletonBar({ width = '100%', className }: { width?: string; className?: string }) {
  return (
    <div
      className={cn('h-2.5 rounded-sm bg-muted animate-pulse', className)}
      style={{ width }}
    />
  );
}

function SidebarSkeleton({ itemCount }: { itemCount: number }) {
  return (
    <div className="space-y-4">
      {/* Profile skeleton */}
      <div className="border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] p-4 flex items-center gap-3">
        <div className="size-10 rounded bg-muted animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBar width="70%" />
          <SkeletonBar width="50%" className="h-2" />
        </div>
      </div>
      {/* Nav skeleton */}
      <div className="border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] p-3 space-y-2">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-1 py-1.5">
            <div className="size-4 rounded bg-muted animate-pulse shrink-0" />
            <SkeletonBar width={`${45 + Math.random() * 40}%`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CollapsedSkeleton({ itemCount }: { itemCount: number }) {
  return (
    <div className="space-y-4">
      <div className="border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] p-2 flex justify-center">
        <div className="size-10 rounded bg-muted animate-pulse" />
      </div>
      <div className="border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] py-1">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div key={i} className="flex justify-center py-2.5">
            <div className="size-4 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-3">
        <SkeletonBar width="40%" className="h-6" />
        <SkeletonBar width="65%" className="h-3" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <SkeletonBar width="30%" className="h-2" />
          <div className="h-32 bg-muted/30 rounded-sm" />
        </div>
        <div className="space-y-3">
          <SkeletonBar width="25%" className="h-2" />
          <div className="flex items-center gap-4">
            <div className="size-20 bg-muted/30 rounded-sm" />
            <SkeletonBar width="80px" className="h-8" />
          </div>
        </div>
      </div>
      <div className="space-y-4 pt-6 border-t-2 border-border/20">
        <SkeletonBar width="25%" className="h-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SkeletonBar width="20%" className="h-2" />
            <div className="h-10 bg-muted/30 rounded-sm" />
          </div>
          <div className="space-y-2">
            <SkeletonBar width="20%" className="h-2" />
            <div className="h-10 bg-muted/30 rounded-sm" />
          </div>
        </div>
        <div className="space-y-2">
          <SkeletonBar width="15%" className="h-2" />
          <div className="h-24 bg-muted/30 rounded-sm" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-6 border-t-2 border-border/20">
        <SkeletonBar width="80px" className="h-10" />
        <SkeletonBar width="120px" className="h-10" />
      </div>
    </div>
  );
}

type TransitionPhase = 'idle' | 'fade-out' | 'skeleton' | 'fade-in';

export default function SettingsPage() {
  const { isOpen: isSidebarOpen } = useSidebar();
  const collapsed = isSidebarOpen;
  const [activeSection, setActiveSection] = useState<SectionId>('edit-profile');
  const [contentLoading, setContentLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Profile & Preferences': true,
  });

  const handleSectionChange = (id: SectionId) => {
    if (id === activeSection) return;
    setContentLoading(true);
    setActiveSection(id);
    setTimeout(() => setContentLoading(false), 400);
  };

  const prevCollapsed = useRef(collapsed);
  const [phase, setPhase] = useState<TransitionPhase>('idle');
  const [renderCollapsed, setRenderCollapsed] = useState(collapsed);

  const totalItems = NAV_GROUPS.reduce((sum, g) => sum + g.items.length, 0);

  useEffect(() => {
    if (prevCollapsed.current === collapsed) return;
    prevCollapsed.current = collapsed;

    setPhase('fade-out');
    const t1 = setTimeout(() => {
      setPhase('skeleton');
      setRenderCollapsed(collapsed);
    }, 150);
    const t2 = setTimeout(() => setPhase('fade-in'), 450);
    const t3 = setTimeout(() => setPhase('idle'), 600);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [collapsed]);

  const toggleGroup = (heading: string) => {
    setOpenGroups((prev) => ({ ...prev, [heading]: !prev[heading] }));
  };

  const activeItemLabel = useMemo(() => {
    return NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeSection)?.label;
  }, [activeSection]);

  const contentOpacity = phase === 'fade-out' || phase === 'skeleton' ? 0 : 1;
  const showSkeleton = phase === 'skeleton';

  return (
    <div className="min-h-screen text-foreground font-sans">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid items-start gap-6 grid-cols-1 lg:grid-cols-[auto_1fr]">

          {/* SIDEBAR */}
          <motion.aside
            className="lg:sticky lg:top-8 overflow-hidden"
            animate={{ width: renderCollapsed ? 56 : 256 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {showSkeleton ? (
              renderCollapsed
                ? <CollapsedSkeleton itemCount={totalItems + 1} />
                : <SidebarSkeleton itemCount={totalItems + 1} />
            ) : (
              <div
                className="space-y-4 transition-opacity duration-150 ease-in-out"
                style={{ opacity: contentOpacity }}
              >
                {/* Profile Brief */}
                <div className={cn(
                  'border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] flex items-center gap-3 overflow-hidden',
                  renderCollapsed ? 'p-2 justify-center' : 'p-4'
                )}>
                  <div className="size-10 border-2 border-border shrink-0 bg-muted">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Harshit" alt="Avatar" />
                  </div>
                  {!renderCollapsed && (
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase truncate whitespace-nowrap">Harshit Kushwah</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter whitespace-nowrap">@harshitkushwah</p>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <nav className="border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] divide-y-2 divide-border overflow-hidden">
                  {renderCollapsed ? (
                    <>
                      <div className="py-1">
                        {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
                          const Icon = item.icon;
                          const isActive = activeSection === item.id;
                          return (
                            <button
                              key={item.id}
                          onClick={() => handleSectionChange(item.id)}
                          title={item.label}
                              className={cn(
                                'w-full flex items-center justify-center py-2.5 transition-colors',
                                isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                              )}
                            >
                              <Icon className="size-4" />
                            </button>
                          );
                        })}
                      </div>
                      <button title="Log Out" className="w-full flex items-center justify-center py-3 text-destructive hover:bg-destructive/5 transition-colors">
                        <LogOut className="size-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      {NAV_GROUPS.map((group) => {
                        const isOpen = !!openGroups[group.heading];
                        return (
                          <div key={group.heading} className="flex flex-col">
                            <button
                              onClick={() => toggleGroup(group.heading)}
                              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                            >
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                {group.heading}
                              </span>
                              <motion.span
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                              >
                                <ChevronDown className="size-3" />
                              </motion.span>
                            </button>

                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  key="content"
                                  initial="collapsed"
                                  animate="expanded"
                                  exit="collapsed"
                                  variants={accordionVariants}
                                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                  className="overflow-hidden"
                                >
                                  <div className="pb-2">
                                    {group.items.map((item) => {
                                      const Icon = item.icon;
                                      const isActive = activeSection === item.id;
                                      return (
                                        <button
                                          key={item.id}
                                          onClick={() => handleSectionChange(item.id)}
                                          className={cn(
                                            'w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold transition-all border-l-4',
                                            isActive
                                              ? 'bg-primary/5 border-primary text-primary'
                                              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                          )}
                                        >
                                          <Icon className={cn('size-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/60')} />
                                          <span className="whitespace-nowrap">{item.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}

                      <button className="w-full flex items-center gap-3 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/5 transition-colors">
                        <LogOut className="size-4" /> Log Out
                      </button>
                    </>
                  )}
                </nav>
              </div>
            )}
          </motion.aside>

          {/* MAIN CONTENT */}
          <main className="min-w-0">
            <div className="border-2 border-border bg-card p-6 md:p-10 shadow-[8px_8px_0px_0px_var(--border)] min-h-[600px]">
              <AnimatePresence mode="wait">
                {contentLoading ? (
                  <motion.div
                    key="skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ContentSkeleton />
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeSection}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeSection === 'edit-profile' ? (
                      <EditProfileContent />
                    ) : activeSection === 'syntax-card' ? (
                      <SyntaxCardContent />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                        <div className="size-16 bg-muted flex items-center justify-center border-2 border-border mb-4">
                          <Settings className="size-8 text-muted-foreground" />
                        </div>
                        <h2 className="text-xl font-black uppercase">{activeItemLabel}</h2>
                        <p className="text-sm text-muted-foreground mt-2 font-medium">
                          This module is currently being updated to the new interface.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
