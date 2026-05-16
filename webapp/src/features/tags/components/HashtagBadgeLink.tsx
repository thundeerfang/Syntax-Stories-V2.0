'use client';

import Link from 'next/link';
import { Hash } from 'lucide-react';
import { cn } from '@/lib/core/utils';


const RETRO_SHADOW =
  'shadow active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all';
const RETRO_BORDER = 'border-2 border-border';

export type HashtagBadgeLinkProps = Readonly<{
  slug: string;
  label: string;
  postCount?: number;
  className?: string;
}>;

/** Neo-brutalist tag chip used on Explore / Topics (matches former Explore `TagPill`). */
export function HashtagBadgeLink({ slug, label, postCount, className }: HashtagBadgeLinkProps) {
  return (
    <Link
      href={`/topics/${encodeURIComponent(slug)}`}
      className={cn(
        'inline-flex items-center gap-1 bg-card px-3 py-2 font-mono text-[10px] font-black uppercase transition-colors hover:bg-primary hover:text-primary-foreground',
        RETRO_BORDER,
        RETRO_SHADOW,
        className,
      )}
    >
      <Hash className="size-3 shrink-0 opacity-70" aria-hidden />
      {label}
      {typeof postCount === 'number' ? <span className="opacity-50">[{postCount.toLocaleString()}]</span> : null}
    </Link>
  );
}
