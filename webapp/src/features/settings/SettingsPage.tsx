'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shell/shellContentRail';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuthStore } from '@/store/auth';
import { SettingsContentSkeleton, SettingsSidebarSkeleton, StackToolsSettingsSkeleton } from '@/components/skeletons';
import { PaymentsSettingsContent } from '@/app/settings/PaymentsSettingsContent';
import { BlogStreakSettingsContent } from '@/app/settings/BlogStreakSettingsContent';
import { SettingsComingSoonPlaceholder } from './components/SettingsComingSoonPlaceholder';
import { SETTINGS_ACCORDION_VARIANTS, SETTINGS_IMPLEMENTED_SECTION_IDS, SETTINGS_NAV_GROUPS } from './config/nav';
import { SyntaxCardContent } from './sections/SyntaxCardSection';
import { EditProfileContent } from './sections/EditProfileSection';
import { SecurityEmailContent } from './sections/SecurityEmailSection';
import { ConnectedAccountsContent } from './sections/ConnectedAccountsSection';
import { StackAndToolsContent } from './sections/StackAndToolsSection';
import { MySetupContent } from './sections/MySetupSection';
import { WorkExperiencesContent } from './sections/WorkExperiencesSection';
import { EducationContent } from './sections/EducationSection';
import { CertificationsContent } from './sections/CertificationsSection';
import { ProjectsContent } from './sections/ProjectsSection';
import { OpenSourceContent } from './sections/OpenSourceSection';


export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isHydrated, shouldBlock } = useRequireAuth();
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const logout = useAuthStore((s) => s.logout);
  const [activeSection, setActiveSection] = useState<string>('edit-profile');
  const [contentLoading, setContentLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Account: true,
    Security: true,
    Other: true,
  });

  const validSectionIds = useMemo(() => SETTINGS_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.id)), []);

  // Re-validate auth when tab becomes visible so token refresh + user sync happen without full page reload
  useEffect(() => {
    if (typeof document === 'undefined' || !token) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshUser();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [token, refreshUser]);

  useEffect(() => {
    const error = searchParams.get('error');
    const linked = searchParams.get('linked');
    const section = searchParams.get('section');
    if (error) {
      toast.error(decodeURIComponent(error));
      router.replace('/settings', { scroll: false });
    } else if (linked) {
      refreshUser();
      toast.success(`${decodeURIComponent(linked)} connected successfully.`);
      router.replace('/settings', { scroll: false });
    } else if (section && validSectionIds.includes(section)) {
      setActiveSection(section);
      // Preserve checkout return params until verify-checkout runs (Payments section).
      const checkout = searchParams.get('checkout');
      if (checkout !== 'success') {
        router.replace('/settings', { scroll: false });
      }
    }
  }, [searchParams, router, refreshUser, validSectionIds]);

  // Support section targeting from profile without exposing ?section= in the URL:
  // profile page stores `settingsTargetSection` (and optional `settingsTargetEditIndex`) in sessionStorage,
  // then navigates to `/settings`. On first load we read and clear that hint.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const target = window.sessionStorage.getItem('settingsTargetSection');
      if (target && validSectionIds.includes(target)) {
        setActiveSection(target);
        window.sessionStorage.removeItem('settingsTargetSection');
      }
    } catch {
      // ignore storage errors
    }
  }, [validSectionIds]);

  const handleSectionChange = (id: string) => {
    if (id === activeSection) return;
    setContentLoading(true);
    setActiveSection(id);
    setTimeout(() => setContentLoading(false), 400);
  };

  const totalItems = SETTINGS_NAV_GROUPS.reduce((sum, g) => sum + g.items.length, 0);

  const toggleGroup = (heading: string) => {
    setOpenGroups((prev) => ({ ...prev, [heading]: !prev[heading] }));
  };

  const activeItemLabel = useMemo(() => {
    return SETTINGS_NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeSection)?.label;
  }, [activeSection]);

  if (!isHydrated || shouldBlock) {
    return (
      <div className="min-h-screen text-foreground font-sans">
        <div className={SHELL_CONTENT_RAIL_CLASS}>
          <div className="grid items-start gap-6 grid-cols-1 lg:grid-cols-[256px_1fr]">
            <aside className="overflow-hidden w-64">
              <SettingsSidebarSkeleton itemCount={totalItems + 1} />
            </aside>
            <main className="min-w-0">
              <div className="border-4 border-border bg-card p-6 md:p-10 shadow min-h-[600px]">
                <SettingsContentSkeleton className="animate-pulse" />
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground font-sans">
      <div className={SHELL_CONTENT_RAIL_CLASS}>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[256px_1fr]">

          {/* SIDEBAR */}
          <aside className="w-full max-w-[256px] mx-auto lg:mx-0 space-y-4">
            {/* User Profile Brief */}
            <div className="border-4 border-border bg-card p-4 flex items-center gap-3 shadow">
              <div className="size-10 border-2 border-border bg-muted overflow-hidden shrink-0">
                <img src={user?.profileImg || user?.image || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase truncate">{user?.fullName || user?.name || 'Account'}</p>
                <p className="text-[9px] font-bold text-muted-foreground ">@{user?.username || 'user'}</p>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="border-4 border-border bg-card shadow divide-y-2 divide-border overflow-hidden">
              {SETTINGS_NAV_GROUPS.map((group) => {
                const isOpen = !!openGroups[group.heading];
                return (
                  <div key={group.heading} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.heading)}
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors w-full text-left"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                        {group.heading}
                      </span>
                      <ChevronDown className={cn('size-3 transition-transform shrink-0', isOpen && 'rotate-180')} />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="content"
                          initial="collapsed"
                          animate="expanded"
                          exit="collapsed"
                          variants={SETTINGS_ACCORDION_VARIANTS}
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
                                  type="button"
                                  onClick={() => handleSectionChange(item.id)}
                                  className={cn(
                                    'w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold border-l-4 transition-all',
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
              <button
                type="button"
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="size-4" /> Log Out
              </button>
            </nav>
          </aside>

          {/* MAIN CONTENT */}
          <main className="min-w-0">
            <div
              className="border-4 border-border bg-card p-6 md:p-10 shadow min-h-0"
            >
              <AnimatePresence mode="wait">
                {contentLoading ? (
                  <motion.div
                    key="skeleton"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {activeSection === 'stack-tools' ? (
                      <StackToolsSettingsSkeleton className="animate-pulse" />
                    ) : (
                      <SettingsContentSkeleton className="animate-pulse" />
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeSection}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeSection === 'edit-profile' && <EditProfileContent />}
                    {activeSection === 'stack-tools' && <StackAndToolsContent />}
                    {activeSection === 'my-setup' && <MySetupContent />}
                    {activeSection === 'work-experiences' && <WorkExperiencesContent />}
                    {activeSection === 'education' && <EducationContent />}
                    {activeSection === 'certifications' && <CertificationsContent />}
                    {activeSection === 'projects' && <ProjectsContent />}
                    {activeSection === 'open-source' && <OpenSourceContent />}
                    {activeSection === 'blog-streak' && <BlogStreakSettingsContent />}
                    {activeSection === 'security-email' && <SecurityEmailContent />}
                    {activeSection === 'connected-accounts' && <ConnectedAccountsContent />}
                    {activeSection === 'syntax-card' && <SyntaxCardContent />}
                    {activeSection === 'payments' && <PaymentsSettingsContent />}
                    {activeSection === 'notifications' && (
                      <SettingsComingSoonPlaceholder
                        title={activeItemLabel}
                        icon={<Bell />}
                        description="Notification channels and digest schedules will be configurable here."
                      />
                    )}
                    {!(SETTINGS_IMPLEMENTED_SECTION_IDS as readonly string[]).includes(activeSection) && (
                      <SettingsComingSoonPlaceholder title={activeItemLabel} />
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
