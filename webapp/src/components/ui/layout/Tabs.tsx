'use client';

import { createContext, useCallback, useContext, useId, useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/core/utils';

type TabsContextValue = {
  value: string;
  onValueChange: (next: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`${component} must be used within <Tabs>`);
  return ctx;
}

export type TabsProps = Readonly<{
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}>;

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const baseId = useId();
  const stable = useCallback((next: string) => onValueChange(next), [onValueChange]);
  const memo = useMemo(() => ({ value, onValueChange: stable, baseId }), [value, stable, baseId]);
  return (
    <TabsContext.Provider value={memo}>
      <div
        className={cn(
          'flex min-h-0 flex-col gap-0 overflow-x-hidden overflow-y-visible',
          className
        )}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = Readonly<{
  children: ReactNode;
  className?: string;
  /** e.g. retro squad tabs */
  variant?: 'default' | 'retro';
}>;

export function TabsList({ children, className, variant = 'default' }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex min-h-0 flex-wrap gap-1',
        variant === 'retro' &&
          'mb-6 gap-0 overflow-x-auto overflow-y-hidden border-b-4 border-border pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        variant === 'default' && 'border-b border-border',
        className
      )}
    >
      {children}
    </div>
  );
}

export type TabsTriggerProps = Readonly<{
  value: string;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'retro';
}>;

export function TabsTrigger({ value, children, className, variant = 'default' }: TabsTriggerProps) {
  const { value: selected, onValueChange, baseId } = useTabsContext('TabsTrigger');
  const isSelected = selected === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isSelected}
      aria-controls={panelId}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        variant === 'default' &&
          cn(
            'border-b-2 border-transparent px-4 py-2.5 text-sm',
            isSelected
              ? 'border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          ),
        variant === 'retro' &&
          cn(
            'shrink-0 px-4 py-3 font-mono text-xs font-black uppercase tracking-widest sm:px-6',
            isSelected
              ? '-mb-1 border-x-2 border-t-2 border-primary bg-primary text-primary-foreground shadow [&_svg]:text-primary-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          ),
        className
      )}
    >
      {children}
    </button>
  );
}

export type TabsContentProps = Readonly<{
  value: string;
  children: ReactNode;
  className?: string;
  /** Hide when inactive instead of unmounting */
  forceMount?: boolean;
}>;

export function TabsContent({ value, children, className, forceMount }: TabsContentProps) {
  const { value: selected, baseId } = useTabsContext('TabsContent');
  const isSelected = selected === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  if (!isSelected && !forceMount) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      hidden={!isSelected}
      className={cn(!isSelected && forceMount && 'hidden', className)}
    >
      {children}
    </div>
  );
}
