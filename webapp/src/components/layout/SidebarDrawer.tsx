'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  BookMarked,
  Tags,
  PlusSquare,
  Zap,
  Compass,
  ArrowUpRight,
  User,
  Brain,
  Cloud,
  Shield,
  Code2,
  Database,
  Smartphone,
  Globe,
  Rocket,
  ChevronRight,
  Trophy,
  Lightbulb,
  Cpu,
  History,
  Flame,
  Star,
  Settings,
  HelpCircle,
  Archive,
  Hash,
  Activity,
  Layers,
  Terminal,
  ShieldCheck,
  TrendingUp,
  Mail,
  Box,
  Layout,
  BookOpen
} from 'lucide-react';

import { useSidebar } from '@/hooks/useSidebar';
import { cn } from '@/lib/utils';

/* ==========================================================================
   DATA STRUCTURES - Rich Content Arrays
   ========================================================================== */

const MAIN_NAV = [
  { href: '/', label: 'HOME FEED', icon: Home },
  { href: '/discover', label: 'EXPLORE DISCOVER', icon: Compass },
  { href: '/library', label: 'USER LIBRARY', icon: BookMarked },
  { href: '/topics', label: 'BROWSE TOPICS', icon: Tags },
];

const BEST_OF_MONTH = [
  { href: '/stories/ai', label: 'The AI Singularity', score: '98', icon: Flame },
  { href: '/stories/react', label: 'React vs Elements', score: '92', icon: Trophy },
  { href: '/stories/code', label: 'Death of Clean Code', score: '89', icon: Activity },
];

const TECH_SUGGESTIONS = [
  { href: '/categories/ai', label: 'AI & MACHINE LEARNING', icon: Brain },
  { href: '/categories/cloud', label: 'CLOUD NATIVE INFRA', icon: Cloud },
  { href: '/categories/cyber', label: 'CYBER SECURITY', icon: Shield },
  { href: '/categories/web3', label: 'WEB3 & BLOCKCHAIN', icon: Globe },
  { href: '/categories/dev-tools', label: 'DEVELOPER TOOLING', icon: Code2 },
];

const INNOVATIONS = [
  { href: '/topics/quantum', label: 'QUANTUM COMPUTING', icon: Cpu, desc: 'Next-gen data processing' },
  { href: '/topics/bio', label: 'NEURAL INTERFACES', icon: Brain, desc: 'Human-AI synaptic link' },
  { href: '/topics/edge', label: 'EDGE INTELLIGENCE', icon: Terminal, desc: 'Local compute inference' },
];

const TRENDING_TAGS = [
  '#nextjs', '#typescript', '#rust', '#docker', '#kubernetes', 
  '#ai', '#llm', '#webgpu', '#serverless', '#devops'
];

const FOLLOWING_CREATORS = [
  { id: '1', name: 'Alex Chen', href: '/u/alex-chen', role: 'Staff Engineer' },
  { id: '2', name: 'Sam Rivera', href: '/u/sam-rivera', role: 'Architect' },
  { id: '3', name: 'Jordan Lee', href: '/u/jordan-lee', role: 'DevOps' },
];

const RECENT_HISTORY = [
  { label: 'Building Scalable LLMs', time: '2h ago' },
  { label: 'State of Bun 1.1', time: '5h ago' },
  { label: 'Postgres vs Mongo', time: '1d ago' },
];

/* ==========================================================================
   SIDEBAR DRAWER COMPONENT
   ========================================================================== */

function SidebarSkeletonContent() {
  return (
    <div className="animate-pulse">
      {/* Create button skeleton */}
      <div className="p-4 border-b-2 border-border">
        <div className="h-11 bg-muted/40 border-2 border-border/30" />
      </div>
      <div className="px-4 py-6 space-y-10">
        {/* Nav items skeleton */}
        <div className="space-y-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="size-4 bg-muted/40 rounded-sm shrink-0" />
              <div className="h-2.5 bg-muted/40 rounded-sm" style={{ width: `${50 + i * 10}%` }} />
            </div>
          ))}
        </div>
        {/* Hall of fame skeleton */}
        <div className="space-y-4">
          <div className="h-2 w-24 bg-muted/30 rounded-sm mx-3" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <div className="size-8 bg-muted/40 border-2 border-border/20 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2 bg-muted/40 rounded-sm" style={{ width: `${60 + i * 8}%` }} />
                <div className="h-1.5 bg-muted/20 rounded-sm w-16" />
              </div>
            </div>
          ))}
        </div>
        {/* Innovations skeleton */}
        <div className="space-y-4">
          <div className="h-2 w-20 bg-muted/30 rounded-sm mx-3" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 border-2 border-border/20 space-y-2">
              <div className="flex items-center gap-3">
                <div className="size-4 bg-muted/40 rounded-sm" />
                <div className="h-2 bg-muted/40 rounded-sm" style={{ width: `${45 + i * 12}%` }} />
              </div>
              <div className="h-1.5 bg-muted/20 rounded-sm w-3/4" />
            </div>
          ))}
        </div>
        {/* Network skeleton */}
        <div className="space-y-3">
          <div className="h-2 w-16 bg-muted/30 rounded-sm mx-3" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <div className="size-4 bg-muted/40 rounded-sm" />
              <div className="h-2 bg-muted/40 rounded-sm" style={{ width: `${40 + i * 10}%` }} />
            </div>
          ))}
        </div>
        {/* Tags skeleton */}
        <div className="space-y-4">
          <div className="h-2 w-24 bg-muted/30 rounded-sm mx-3" />
          <div className="flex flex-wrap gap-2 px-3">
            {[28, 42, 22, 36, 48, 18, 30, 40].map((w, i) => (
              <div key={i} className="h-6 bg-muted/30 border-2 border-border/15 rounded-sm" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SidebarDrawer() {
  const { isOpen, close } = useSidebar();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const prevOpen = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && !prevOpen.current) {
      setShowContent(false);
      const timer = setTimeout(() => setShowContent(true), 350);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      setShowContent(false);
    }
    prevOpen.current = isOpen;
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-30 bg-black/20 cursor-pointer"
            style={{ top: 'var(--header-height)' }}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'sidebar-drawer fixed left-0 z-40 flex w-60 flex-col border-t-2 border-r-2 border-border bg-background transition-transform duration-300 ease-in-out',
          'bottom-0 overflow-y-auto overflow-x-hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ top: 'var(--header-height)' }}
        aria-hidden={!isOpen}
      >
        {isOpen && !showContent ? (
          <SidebarSkeletonContent />
        ) : (
          <>
          <div className="p-4 border-b-2 border-border sticky top-0 bg-background z-10">
          <Link
            href="/create"
            onClick={close}
            className="flex items-center justify-center gap-2 w-full border-2 border-border bg-primary py-3 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
          >
            <PlusSquare className="size-4" strokeWidth={3} />
            Create New Post
          </Link>
        </div>

        {/* 
            MAIN NAVIGATION AREA
        */}
        <nav className="flex-1 px-4 py-6 space-y-10">
          
          {/* SECTION: MAIN ROUTES */}
          <section>
            <ul className="space-y-1.5">
              {MAIN_NAV.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={close}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 text-[11px] font-black uppercase tracking-widest border-2 transition-all cursor-pointer',
                        isActive
                          ? 'bg-primary text-primary-foreground border-border shadow-[4px_4px_0px_0px_var(--border)]'
                          : 'bg-transparent text-foreground/70 border-transparent hover:border-border hover:bg-muted/30'
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", isActive ? "text-primary-foreground" : "text-primary")} strokeWidth={isActive ? 3 : 2.5} />
                      <span className="flex-1">{label}</span>
                      {isActive && <ChevronRight className="size-3 text-primary-foreground" strokeWidth={4} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* SECTION: BEST OF THE MONTH */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground px-3 flex items-center justify-between border-l-2 border-primary/30">
              HALL OF FAME
              <TrendingUp className="size-3" />
            </h3>
            <div className="space-y-2">
              {BEST_OF_MONTH.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={close}
                  className="flex items-center gap-3 px-3 py-2 group hover:bg-muted/40 border-2 border-transparent hover:border-border transition-all cursor-pointer"
                >
                  <div className="size-8 bg-card text-foreground flex items-center justify-center text-[10px] font-black border-2 border-border group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0 shadow-[2px_2px_0px_0px_var(--border)]">
                    {item.score}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black truncate leading-none uppercase tracking-tight">{item.label}</p>
                    <div className="flex items-center gap-1 mt-1 opacity-60">
                       <item.icon className="size-2.5" />
                       <span className="text-[8px] font-black uppercase">Top Quality</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* SECTION: TECH INNOVATIONS */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground px-3 flex items-center gap-2 border-l-2 border-primary/30">
               <Lightbulb className="size-3" /> INNOVATIONS
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {INNOVATIONS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={close}
                  className="group block p-3 border-2 border-border bg-muted/10 hover:bg-card hover:shadow-[4px_4px_0px_0px_var(--primary)] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    <item.icon className="size-4 text-primary" strokeWidth={2.5} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
                  </div>
                  <p className="text-[9px] font-bold text-muted-foreground group-hover:text-foreground leading-tight">
                    {item.desc}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* SECTION: NETWORK CATEGORIES */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground px-3 border-l-2 border-primary/30">
              NETWORK
            </h3>
            <ul className="space-y-0.5">
              {TECH_SUGGESTIONS.map(({ href, label, icon: Icon }) => (
                <li key={label}>
                  <Link
                    href={href}
                    onClick={close}
                    className="flex items-center justify-between group px-3 py-2 text-[10px] font-black text-foreground border-b border-border/10 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="size-4 text-primary group-hover:text-primary-foreground transition-colors" strokeWidth={2} />
                      {label}
                    </div>
                    <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-all" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* SECTION: ARCHIVE VAULT */}
          <section className="space-y-4 py-6 px-2 bg-primary/5 border-y-2 border-dashed border-primary/20">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary px-1 text-center mb-4">
              ARCHIVE VAULT
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Tech Stack 2023', icon: Layers, desc: 'Complete ecosystem map' },
                { label: 'System Design Vol.1', icon: Box, desc: 'Architecture fundamentals' },
                { label: 'Open Source Gems', icon: ShieldCheck, desc: 'Curated repository list' }
              ].map((link) => (
                <Link
                  key={link.label}
                  href={`/archive/${link.label.toLowerCase().replace(/\s/g, '-')}`}
                  className="block p-3 border-2 border-border bg-card shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <link.icon className="size-4 text-primary" strokeWidth={3} />
                    <span className="text-[11px] font-black uppercase tracking-tight group-hover:text-primary">{link.label}</span>
                  </div>
                  <p className="text-[9px] font-bold text-muted-foreground italic pl-7">
                    {link.desc}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* SECTION: TAG CLOUD */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground px-3 flex items-center gap-2 border-l-2 border-primary/30">
               <Hash className="size-3" /> TRENDING TAGS
            </h3>
            <div className="flex flex-wrap gap-2 px-3">
              {TRENDING_TAGS.map((tag) => (
                <Link
                  key={tag}
                  href={`/topics/${tag.slice(1)}`}
                  className="text-[9px] font-black text-foreground border-2 border-border px-2 py-1 bg-muted/10 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all uppercase cursor-pointer"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </section>

          {/* SECTION: RECENT HISTORY */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground px-3 flex items-center gap-2 border-l-2 border-primary/30">
              <History className="size-3" /> RECENT
            </h3>
            <div className="space-y-1">
              {RECENT_HISTORY.map((item) => (
                <Link key={item.label} href="#" className="flex items-center justify-between px-3 py-1.5 group cursor-pointer">
                  <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground truncate flex-1">
                    {item.label}
                  </span>
                  <span className="text-[8px] font-black text-muted-foreground/30 ml-2">
                    {item.time}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* SECTION: FOLLOWING */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground px-3 border-l-2 border-primary/30">
              FOLLOWING
            </h3>
            <ul className="space-y-2">
              {FOLLOWING_CREATORS.map((creator) => (
                <li key={creator.id}>
                  <Link
                    href={creator.href}
                    className="flex items-center gap-3 px-3 py-1 group transition-all cursor-pointer"
                  >
                    <div className="size-7 border-2 border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 group-hover:border-primary group-hover:bg-primary transition-all">
                      <User className="size-4 text-muted-foreground group-hover:text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                       <p className="text-[10px] font-black truncate uppercase group-hover:text-primary">{creator.name}</p>
                       <p className="text-[8px] font-black text-muted-foreground uppercase leading-none">{creator.role}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </nav>

        {/* 
            FOOTER AREA 
        */}
        <div className="p-4 mt-auto border-t-2 border-border bg-muted/5">
          <div className="relative border-2 border-border p-5 bg-card space-y-4 shadow-[6px_6px_0px_0px_var(--border)] group">
            <div className="absolute -right-4 -top-4 size-12 bg-primary flex items-center justify-center border-2 border-border rotate-12 transition-transform group-hover:rotate-0">
               <Zap className="size-5 text-primary-foreground fill-current" />
            </div>
            
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                PRO PLUS
              </span>
              <p className="text-[10px] font-black leading-tight text-foreground pr-4">
                Unlimited stories & AI risk analysis.
              </p>
            </div>
            
            <Link
              href="/plus"
              onClick={close}
              className="block w-full text-center border-2 border-border bg-primary py-2.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground hover:bg-card hover:text-primary transition-all cursor-pointer"
            >
              Learn More
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-1 px-1">
             <Link href="/settings" className="flex items-center gap-2 py-2 text-[10px] font-black uppercase text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                <Settings className="size-3.5" /> Account Settings
             </Link>
             <Link href="/help" className="flex items-center gap-2 py-2 text-[10px] font-black uppercase text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                <HelpCircle className="size-3.5" /> Support Center
             </Link>
          </div>
          
          <div className="mt-6 pt-4 border-t border-border/10 flex justify-center gap-4 pb-2">
            {['Privacy', 'Terms', 'Legal'].map((label) => (
              <Link 
                key={label} 
                href={`/${label.toLowerCase()}`} 
                onClick={close}
                className="text-[9px] font-black uppercase text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
          </>
        )}
      </aside>
    </>
  );
}