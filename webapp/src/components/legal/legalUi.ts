/**
 * Shared legal zone tokens — retro cards, mono labels, ToC, document chrome, CTAs.
 * Import from here only; avoid re-declaring the same class strings in sibling components.
 */

export const LEGAL_MIN_BELOW_HEADER = 'min-h-[calc(100vh-var(--header-height))]';

/** Thick border + block shadow card (shell cards + route header). */
export const LEGAL_RETRO_CARD =
  'border-4 border-border bg-card text-card-foreground shadow-[8px_8px_0_0_var(--border)]';

/** Small square icon frame (ToC strip, policy header). */
const LEGAL_RETRO_ICON_TILE_BASE =
  'flex shrink-0 items-center justify-center border-2 border-border bg-card shadow-[2px_2px_0_0_var(--border)]';

export const LEGAL_RETRO_ICON_TILE_TOC = `${LEGAL_RETRO_ICON_TILE_BASE} size-9`;
export const LEGAL_RETRO_ICON_TILE_HEADER = `${LEGAL_RETRO_ICON_TILE_BASE} size-10`;

/** ToC panel title strip (top of outline card). */
export const LEGAL_TOC_STRIP = 'shrink-0 border-b-4 border-border bg-muted/35 px-4 py-4 sm:px-6';

export const LEGAL_TOC_NAV_PAD = 'min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5';

export const LEGAL_TOC_TITLE =
  'font-mono text-xs font-black uppercase tracking-[0.18em] text-foreground';

export const LEGAL_TOC_SUB =
  'mt-1 max-w-[14rem] text-[11px] font-medium leading-snug tracking-wide text-muted-foreground';

export const LEGAL_TOC_LIST = 'flex flex-col gap-1';

export const LEGAL_TOC_LINK =
  'block border-2 border-transparent px-2.5 py-2 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground transition-all hover:border-border hover:bg-card hover:text-foreground hover:shadow-[2px_2px_0_0_var(--border)] active:translate-x-px active:translate-y-px active:shadow-none';

/** UDD / action block below policy body */
export const LEGAL_ACTION_PANEL =
  'border-2 border-dashed border-border bg-muted/10 p-5 shadow-[3px_3px_0_0_var(--border)] sm:p-6';

export const LEGAL_ACTION_KICKER =
  'font-mono text-[10px] font-black uppercase tracking-[0.2em] text-primary';

export const LEGAL_ACTION_TITLE =
  'mt-1 text-lg font-black tracking-tight text-foreground sm:text-xl';

export const LEGAL_ACTION_BODY = 'mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground';

export const LEGAL_ACTION_CTA_ROW = 'mt-5 flex flex-wrap gap-3';

/** Version + dates badge in the route header (retro block). */
export const LEGAL_VERSION_BADGE =
  'flex shrink-0 flex-col gap-1 border-2 border-border bg-muted/50 px-3 py-2.5 shadow-[3px_3px_0_0_var(--border)] sm:px-4';

export const LEGAL_VERSION_BADGE_LINE_PRIMARY =
  'font-mono text-[11px] font-black uppercase leading-tight tracking-wide text-foreground tabular-nums';

export const LEGAL_VERSION_BADGE_LINE_MUTED =
  'font-mono text-[10px] font-bold uppercase leading-snug tracking-wide text-muted-foreground tabular-nums';

export const LEGAL_MARKDOWN_ROOT =
  'legal-markdown prose prose-neutral max-w-none dark:prose-invert prose-p:leading-relaxed prose-headings:scroll-mt-28 prose-headings:font-black prose-a:text-primary prose-h2:mt-10 prose-h2:scroll-mt-28 prose-h2:border-b-2 prose-h2:border-border prose-h2:pb-2 prose-h2:text-xl prose-h3:mt-8 prose-h3:scroll-mt-28 prose-h3:text-base';

export const LEGAL_MAIN_BODY_PAD = 'px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10';

/** Route-level policy header (LegalPolicyPageHeader). */
export const LEGAL_ROUTE_HEADER_WRAP = 'w-full shrink-0 px-4 py-5 sm:px-8';

/** API policy summary under the route title. */
export const LEGAL_HEADER_SUMMARY = 'mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground';

export const LEGAL_MONO_KICKER =
  'font-mono text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground';

export const LEGAL_MONO_PAGE_TITLE =
  'mt-1 font-mono text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl';

export const LEGAL_MONO_ASIDE =
  'max-w-md font-mono text-[10px] font-bold uppercase leading-relaxed tracking-wide text-muted-foreground sm:text-right';

/** Fallback / unavailable titles (match document scale without responsive bump). */
export const LEGAL_UNAVAILABLE_TITLE = 'text-2xl font-black tracking-tight text-foreground';

export const LEGAL_UNAVAILABLE_BODY = 'text-sm text-muted-foreground leading-relaxed';

export const LEGAL_INLINE_CODE =
  'rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs';

/** Divider + block below published policy (e.g. UDD request panel). */
export const LEGAL_CARD_SECTION_RULE = 'mt-10 border-t-4 border-dashed border-border pt-10';

export const LEGAL_PRIMARY_CTA =
  'inline-flex min-h-[2.75rem] items-center justify-center gap-2 border-2 border-primary bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-[3px_3px_0_0_var(--border)] transition-all hover:opacity-95 active:translate-x-px active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-50';

export const LEGAL_MUTED_INLINE = 'text-sm text-muted-foreground leading-relaxed';
