'use client';

import { SquadsDiscoverFeaturedPageContent } from '@/components/squads/SquadsDiscoverFeaturedPageContent';
import { SHELL_CONTENT_RAIL_CLASS } from '@/lib/shellContentRail';
import { cn } from '@/lib/utils';

export default function SquadsFeaturedPage() {
  return (
    <div className={cn(SHELL_CONTENT_RAIL_CLASS, 'flex min-h-0 flex-1 flex-col overflow-visible')}>
      <SquadsDiscoverFeaturedPageContent />
    </div>
  );
}
