/**
 * Horizontal rail cell width — matches `SquadDiscoverCard` root `max-w-[22.5rem]`,
 * capped on narrow viewports so carousels do not overflow.
 */
export const SQUAD_DISCOVER_CARD_SLIDE_CLASS =
  'flex-none shrink-0 snap-start snap-always w-[min(22.5rem,calc(100vw-2rem))]';

/** Grid of squad cards: no ultra-wide 4–5 column rows; cards stay a fixed max width. */
export const SQUAD_DISCOVER_CARD_GRID_CLASS = 'flex flex-wrap  justify-items-center gap-4 w-full';
