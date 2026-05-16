'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { SquadSummary } from '@/api/squads';
import { SquadDiscoverCard } from '@/components/squads/SquadDiscoverCard';
import { cn } from '@/lib/utils';

export type SquadDirectoryCardProps = Readonly<{
  squad: SquadSummary;
  isMember: boolean;
  isAdmin?: boolean;
  /** Join public squad in-place; private navigates to detail. */
  onJoin: (slug: string) => void;
  joinBusy?: boolean;
  /** Overrides default “Join squad” / “Open squad” label for non-members (used for icon aria-label). */
  joinCtaLabel?: string;
  /** Shown in card menu for squad admins. */
  onEditSquad?: () => void;
}>;

export function SquadDirectoryCard({
  squad,
  isMember,
  isAdmin = false,
  onJoin,
  joinBusy,
  joinCtaLabel,
  onEditSquad,
}: SquadDirectoryCardProps) {
  const [cardMenuOpen, setCardMenuOpen] = useState(false);
  const cardMenuRef = useRef<HTMLDivElement>(null);
  const showAdminMenu = isAdmin && onEditSquad;

  useEffect(() => {
    if (!cardMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (!cardMenuRef.current?.contains(e.target as Node)) setCardMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [cardMenuOpen]);

  return (
    <SquadDiscoverCard
      squad={squad}
      isMember={isMember}
      joinBusy={joinBusy}
      onJoin={onJoin}
      joinCtaLabel={joinCtaLabel}
      topRightAccessory={
        showAdminMenu ? (
          <div ref={cardMenuRef} className="relative shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={cardMenuOpen}
              aria-haspopup="menu"
              aria-label="Squad actions"
              className="size-9 border-2 border-border bg-card p-0 shadow-[2px_2px_0_0_var(--border)]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCardMenuOpen((o) => !o);
              }}
            >
              <MoreHorizontal className="size-5 shrink-0" strokeWidth={2} aria-hidden />
            </Button>
            {cardMenuOpen ? (
              <ul
                role="menu"
                className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[11rem] border-2 border-border bg-card py-1 shadow-[4px_4px_0_0_var(--border)]"
              >
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted/60"
                    onClick={() => {
                      setCardMenuOpen(false);
                      onEditSquad();
                    }}
                  >
                    <Pencil className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                    Edit squad
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
        ) : null
      }
    />
  );
}
