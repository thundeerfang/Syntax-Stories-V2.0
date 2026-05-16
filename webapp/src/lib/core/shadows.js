/**
 * Single block-shadow token for the whole app.
 * CSS value: `globals.css` `@theme --shadow` → `2px 2px 0 0 var(--shadow-color)`.
 *
 * @example
 * import { SHADOW } from '@/lib/core/shadows';
 * <motion.div className={cn('border-2 border-border bg-card', SHADOW)} />
 */

/** Default neo-brutalist offset shadow. */
export const SHADOW = 'shadow';

/** Block buttons: same shadow + gray hover wash. */
export const SHADOW_BLOCK_BUTTON =
  'shadow hover:shadow-block-hover active:translate-x-1 active:translate-y-1 active:shadow-none';

/** Ghost outline buttons: inset hover wash only (no block offset). */
export const SHADOW_GHOST_HOVER = 'hover:shadow-ghost-inset';

/** Retro layout shells (border + single shadow). */
export const retro = {
  card: 'retro-card',
  cardLg: 'retro-card-lg',
  panel: 'retro-panel',
  metricCard: 'retro-metric-card',
  dropdownPanel: 'retro-dropdown-panel',
};
