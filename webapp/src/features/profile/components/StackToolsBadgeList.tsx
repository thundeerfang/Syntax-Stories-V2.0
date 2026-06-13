'use client';

import { Monitor } from 'lucide-react';
import type { TechStackItem } from '@contracts/referenceApi';
import { SkillIconImage } from '@/components/ui/media';
import { useResolvedTechStack } from '@/hooks/useResolvedTechStack';
import { STACK_AND_TOOLS_MAX } from '@/lib/profile/stackAndToolsLimits';

type StackToolsBadgeListProps = Readonly<{
  names: string[];
  /** When provided (e.g. from profile API), skips client resolve. */
  displayItems?: TechStackItem[];
}>;

/** Read-only stack badges — prefers profile `stackAndToolsDisplay`, else resolves via API. */
export function StackToolsBadgeList({ names, displayItems }: StackToolsBadgeListProps) {
  const display = names.slice(0, STACK_AND_TOOLS_MAX);
  const useServerDisplay = Boolean(displayItems && displayItems.length > 0);
  const resolved = useResolvedTechStack(useServerDisplay ? [] : display);
  const items = useServerDisplay ? displayItems! : resolved;

  return (
    <div className="flex flex-wrap gap-3 py-1">
      {display.map((name, index) => {
        const item = items[index];
        const iconUrl = item?.iconUrl?.trim() ?? '';

        return (
          <div
            key={`stack-${name}-${index}`}
            className="border-2 border-border bg-muted/10 px-3 py-2 shadow max-w-full"
            title={name}
          >
            <div className="flex items-center gap-2">
              <div className="size-7 shrink-0 flex items-center justify-center overflow-hidden">
                {iconUrl ? (
                  <SkillIconImage src={iconUrl} alt={name} className="size-full" />
                ) : (
                  <Monitor className="size-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground break-words text-left">
                {name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
