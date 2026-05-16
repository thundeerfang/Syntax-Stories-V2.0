import type { ReactNode } from 'react';
import { cn } from '@/lib/core/utils';
import { retroCard, retroCardLg } from '@/lib/core/retroUi';


export type RetroCardSize = 'md' | 'lg';

export type RetroCardProps = Readonly<{
  children: ReactNode;
  className?: string;
  /** `md` = border-2 + shadow; `lg` = border-4 + shadow (default). */
  size?: RetroCardSize;
}>;

export function RetroCard({ children, className, size = 'lg' }: RetroCardProps) {
  return <div className={cn(size === 'lg' ? retroCardLg : retroCard, className)}>{children}</div>;
}
