'use client';

import { SquadDiscoverCard, type SquadDiscoverCardProps } from '@/components/squads/SquadDiscoverCard';

export type FeaturedSquadCardProps = SquadDiscoverCardProps;

/**
 * Featured rail wrapper — same surface as directory discover cards.
 */
export function FeaturedSquadCard(props: FeaturedSquadCardProps) {
  return <SquadDiscoverCard {...props} />;
}
