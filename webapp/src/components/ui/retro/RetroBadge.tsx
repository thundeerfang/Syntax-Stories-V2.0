'use client';

import * as React from 'react';
import { cn } from '@/lib/core/utils';

export function RetroBadge({
  children,
  variant = 'default',
  className,
}: Readonly<{
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'outline';
  className?: string;
}>) {
  const variants: Record<string, string> = {
    default: 'bg-muted text-muted-foreground border-border',
    primary: 'bg-primary text-primary-foreground border-primary shadow',
    outline: 'bg-transparent text-foreground border-border',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 border-2 text-[10px] font-black uppercase tracking-wider',
        variants[variant] ?? variants.default,
        className
      )}
    >
      {children}
    </span>
  );
}
