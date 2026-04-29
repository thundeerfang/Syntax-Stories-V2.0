'use client';

import { cn } from '@/lib/utils';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';
import { SkBar, SkBlock } from './primitives';

export function SettingsSidebarSkeleton({ itemCount }: { itemCount: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 border-4 border-border bg-card p-4 shadow-[4px_4px_0px_0px_var(--border)]">
        <SkBlock className="size-10 shrink-0 animate-pulse" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkBar className="h-2.5 w-[70%]" />
          <SkBar className="h-2 w-[50%]" />
        </div>
      </div>
      <div className="space-y-2 border-4 border-border bg-card p-3 shadow-[4px_4px_0px_0px_var(--border)]">
        {Array.from({ length: itemCount }, (_, idx) => `nav-skeleton-${idx + 1}`).map((itemId, i) => (
          <div key={itemId} className="flex items-center gap-3 px-1 py-1.5">
            <SkBlock className="size-4 shrink-0 animate-pulse" />
            <SkBar style={{ width: `${45 + ((i * 11) % 41)}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsContentSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-8', className)}>
      <div className="space-y-3">
        <SkBar className="h-6 w-[40%]" />
        <SkBar className="h-3 w-[65%]" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <SkBar className="h-2 w-[30%]" />
          <SkBlock className="h-32 animate-pulse" />
        </div>
        <div className="space-y-3">
          <SkBar className="h-2 w-[25%]" />
          <div className="flex items-center gap-4">
            <SkBlock className="size-20 animate-pulse" />
            <SkBar className="h-8 w-20" />
          </div>
        </div>
      </div>
      <div className="space-y-4 border-t-2 border-border/20 pt-6">
        <SkBar className="h-2 w-[25%]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <SkBar className="h-2 w-[20%]" />
            <SkBlock className="h-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <SkBar className="h-2 w-[20%]" />
            <SkBlock className="h-10 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <SkBar className="h-2 w-[15%]" />
          <SkBlock className="h-24 animate-pulse" />
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t-2 border-border/20 pt-6">
        <SkBar className="h-10 w-20" />
        <SkBar className="h-10 w-[120px]" />
      </div>
    </div>
  );
}

/** Settings grid — for route `loading` and auth gate (inside main content). */
export function SettingsPageSkeletonInner({ navItems = 18 }: { navItems?: number }) {
  return (
    <div className="min-h-screen font-sans text-foreground">
      <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'py-8 md:py-12')}>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[256px_1fr]">
          <aside className="mx-auto w-full max-w-[256px] overflow-hidden lg:mx-0">
            <SettingsSidebarSkeleton itemCount={navItems} />
          </aside>
          <main className="min-w-0">
            <div className="min-h-[600px] border-4 border-border bg-card p-6 shadow-[8px_8px_0px_0px_var(--border)] md:p-10">
              <SettingsContentSkeleton className="animate-pulse" />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
