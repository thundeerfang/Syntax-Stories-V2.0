import type { LucideIcon } from 'lucide-react';
import { Activity, Bookmark, Eye, MessageSquare, Repeat2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const RAIL_CARD =
  'border-2 border-border bg-card p-4 shadow-[4px_4px_0_0_var(--border)]';

function formatStat(n: number): string {
  if (n > 99) return '99+';
  return String(Math.max(0, n));
}

function StatRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  value: string;
  valueClassName?: string;
}>) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          'shrink-0 font-mono text-xs font-black tabular-nums text-foreground',
          valueClassName,
        )}
      >
        {value}
      </span>
    </li>
  );
}

/**
 * Compact engagement counts for the blog post left rail (above the Index / TOC card).
 */
export function BlogPostSidebarStats({
  respectCount,
  repostCount,
  bookmarkCount,
  viewCount,
  commentTotal,
  commentLoading,
}: Readonly<{
  respectCount: number;
  repostCount: number;
  bookmarkCount: number;
  viewCount: number;
  commentTotal: number;
  commentLoading: boolean;
}>) {
  return (
    <section className={RAIL_CARD} aria-label="Post engagement">
      <h2 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        <Activity className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
        Stats
      </h2>
      <ul className="m-0 list-none space-y-2 p-0">
        <StatRow icon={Zap} label="Respect" value={formatStat(respectCount)} />
        <StatRow icon={Repeat2} label="Repost" value={formatStat(repostCount)} />
        <StatRow icon={Bookmark} label="Saved" value={formatStat(bookmarkCount)} />
        <StatRow icon={Eye} label="Views" value={formatStat(viewCount)} />
        <StatRow
          icon={MessageSquare}
          label="Comments"
          value={commentLoading ? '…' : formatStat(commentTotal)}
          valueClassName={commentLoading ? 'text-muted-foreground' : undefined}
        />
      </ul>
    </section>
  );
}
