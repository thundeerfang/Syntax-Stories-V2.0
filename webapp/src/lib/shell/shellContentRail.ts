import type { CSSProperties } from 'react';

/** Same horizontal bounds as `Navbar` inner row (logo / links / actions). */
export const SHELL_NAV_INNER_CLASS = 'mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8';

/**
 * Frosted rail chrome: use on an **inner** layer (no border on that node). Theme is driven by
 * `html.dark` in `globals.css` so SSR markup matches hydration (avoid `useTheme().isDark` inline styles).
 */
export const SHELL_RAIL_FROST_CLASS = 'shell-rail-frost';
export const SHELL_RAIL_FROST_STYLE: CSSProperties = {
  backgroundColor: 'var(--rail-frost-bg)',
  backdropFilter: 'saturate(2.0) blur(10px)',
  WebkitBackdropFilter: 'saturate(2.0) blur(10px)',
};

/**
 * Page shell under the sidebar: `mx-auto max-w-[90rem]` is centered in the **main column**, while the
 * navbar centers on the **viewport**, so content sits left of the logo. Extra `pl-*` nudges text toward
 * the logo line; `pr-*` stays aligned with the nav’s right gutter.
 */
export const SHELL_CONTENT_RAIL_CLASS =
  'mx-auto w-full max-w-[90rem] pr-4 pt-2 pb-4 pl-7 sm:pr-6 sm:pt-3 sm:pb-5 sm:pl-9 lg:pr-8 lg:pt-3 lg:pb-6 lg:pl-11';

export const SHELL_CONTENT_MEASURE_CLASS = 'mx-auto w-full max-w-[min(88rem,100%)]';
