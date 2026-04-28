import { blockShadowButtonClassNames } from '@/components/ui/BlockShadowButton';
import { cn } from '@/lib/utils';

/**
 * Settings primary actions — same block shadow + hover/active press as `BlockShadowButton`.
 * Pair with extra `className` for padding/width (e.g. `px-6 py-2.5 text-[11px]`).
 */
export const settingsBtnBlockPrimaryMd = blockShadowButtonClassNames({
  variant: 'primary',
  shadow: 'md',
});

export const settingsBtnBlockPrimarySm = blockShadowButtonClassNames({
  variant: 'primary',
  shadow: 'sm',
});

/** Avatar / compact primary icon button */
export const settingsBtnIconFab = cn(
  blockShadowButtonClassNames({ variant: 'primary', shadow: 'sm' }),
  '!gap-0 !p-0 size-7 min-h-0 shrink-0',
);
