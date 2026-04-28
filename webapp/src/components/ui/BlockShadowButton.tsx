import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Outer block shadow + inset gray wash on hover (`--block-btn-hover-inset` in globals.css).
 * Press: shadow clears + translate only while `:active`.
 */
const blockShadowMd =
  'shadow-[4px_4px_0px_0px_var(--border)] hover:shadow-[4px_4px_0px_0px_var(--border),inset_0_0_0_100vmax_var(--block-btn-hover-inset)] active:translate-x-1 active:translate-y-1 active:shadow-none';

const blockShadowSm =
  'shadow-[2px_2px_0px_0px_var(--border)] hover:shadow-[2px_2px_0px_0px_var(--border),inset_0_0_0_100vmax_var(--block-btn-hover-inset)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none';

export type BlockShadowButtonVariant = 'primary' | 'secondary' | 'outline';
export type BlockShadowButtonSize = 'sm' | 'md' | 'lg';
export type BlockShadowDepth = 'md' | 'sm';

export type BlockShadowButtonClassOptions = {
  variant?: BlockShadowButtonVariant;
  size?: BlockShadowButtonSize;
  /** 4px offset shadow (default) or 2px. */
  shadow?: BlockShadowDepth;
  fullWidth?: boolean;
  className?: string;
};

/**
 * Class string for block shadow + border; gray hover wash; shadow clears only while pressed (`:active`).
 * Use with `next/link` or other elements: `<Link className={blockShadowButtonClassNames({ ... })} />`.
 */
export function blockShadowButtonClassNames(options: BlockShadowButtonClassOptions = {}): string {
  const {
    variant = 'primary',
    size = 'md',
    shadow = 'md',
    fullWidth = false,
    className,
  } = options;

  return cn(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-none border-2 border-border font-black uppercase tracking-widest',
    'transition-[transform,box-shadow] duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    shadow === 'sm' ? blockShadowSm : blockShadowMd,
    {
      'bg-primary text-primary-foreground': variant === 'primary',
      'bg-background text-foreground': variant === 'secondary',
      'bg-transparent text-foreground': variant === 'outline',
    },
    {
      'px-3 py-2 text-[10px]': size === 'sm',
      'px-4 py-3 text-xs': size === 'md',
      'px-6 py-3.5 text-sm': size === 'lg',
    },
    fullWidth && 'w-full',
    className,
  );
}

export type BlockShadowButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> &
  BlockShadowButtonClassOptions & { className?: string };

/**
 * Reusable neo-brutalist button: gray hover wash; offset shadow clears on press (`:active`) only.
 */
export const BlockShadowButton = forwardRef<HTMLButtonElement, BlockShadowButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      shadow = 'md',
      fullWidth = false,
      className,
      type = 'button',
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          blockShadowButtonClassNames({ variant, size, shadow, fullWidth, className }),
          'disabled:pointer-events-none disabled:opacity-50',
        )}
        {...props}
      />
    );
  },
);

BlockShadowButton.displayName = 'BlockShadowButton';
