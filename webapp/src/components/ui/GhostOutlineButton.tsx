import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type GhostOutlineButtonSize = 'sm' | 'md' | 'lg';

export type GhostOutlineButtonClassOptions = {
  size?: GhostOutlineButtonSize;
  fullWidth?: boolean;
  className?: string;
};

/**
 * Card / white field + neutral outline. Hover: gray inset wash (`--ghost-btn-hover-inset`).
 * Press / focus-visible: primary border. Separate from `BlockShadowButton` (no block shadow).
 */
export function ghostOutlineButtonClassNames(options: GhostOutlineButtonClassOptions = {}): string {
  const { size = 'md', fullWidth = false, className } = options;

  return cn(
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-none border-2 border-border bg-card text-foreground',
    'transition-[box-shadow,border-color,color] duration-150 ease-out',
    'hover:shadow-[inset_0_0_0_100vmax_var(--ghost-btn-hover-inset)]',
    'active:border-primary focus-visible:outline-none focus-visible:border-primary',
    {
      'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide': size === 'sm',
      'px-5 py-2.5 text-xs font-bold uppercase tracking-wide': size === 'md',
      'px-6 py-4 text-xs font-black uppercase tracking-widest': size === 'lg',
    },
    fullWidth && 'w-full',
    className,
  );
}

export type GhostOutlineButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> &
  GhostOutlineButtonClassOptions & { className?: string };

export const GhostOutlineButton = forwardRef<HTMLButtonElement, GhostOutlineButtonProps>(
  ({ size = 'md', fullWidth = false, className, type = 'button', disabled, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(
        ghostOutlineButtonClassNames({ size, fullWidth, className }),
        'disabled:pointer-events-none disabled:opacity-50',
      )}
      {...props}
    />
  ),
);

GhostOutlineButton.displayName = 'GhostOutlineButton';
