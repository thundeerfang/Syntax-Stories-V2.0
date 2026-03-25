/**
 * Settings page button system:
 * - Primary: no hover translate/shadow shift; 3D “press” only while :active (click).
 * - Secondary: outline style; hover is background only, no movement.
 * Use `settingsBtnShadowLg` or `settingsBtnShadowSm` with primary core for consistent depth.
 */
export const settingsBtnPrimary =
  'inline-flex items-center justify-center gap-2 border-2 border-border bg-primary text-primary-foreground font-black uppercase transition-[transform,box-shadow] duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none active:shadow-none active:translate-x-0.5 active:translate-y-0.5';

export const settingsBtnShadowLg = 'shadow-[4px_4px_0px_0px_var(--border)]';
export const settingsBtnShadowSm = 'shadow-[2px_2px_0px_0px_var(--border)]';

/** Cancel / Close in form footers */
export const settingsBtnSecondary =
  'inline-flex items-center justify-center px-5 py-2.5 border-2 border-border bg-background font-bold text-xs uppercase tracking-wide text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Small Cancel in inline link editors */
export const settingsBtnSecondaryCompact =
  'inline-flex items-center justify-center px-3 py-1.5 border-2 border-border bg-background font-bold text-[10px] uppercase text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Secondary next to large primary (e.g. email change flow) */
export const settingsBtnSecondaryWide =
  'inline-flex items-center justify-center px-6 py-4 border-2 border-border bg-background font-black text-xs uppercase tracking-widest text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Avatar / compact primary icon button */
export const settingsBtnIconFab =
  'inline-flex items-center justify-center bg-primary text-primary-foreground border-2 border-border shadow-[2px_2px_0px_0px_var(--border)] transition-[transform,box-shadow] duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:shadow-none active:translate-x-0.5 active:translate-y-0.5';
