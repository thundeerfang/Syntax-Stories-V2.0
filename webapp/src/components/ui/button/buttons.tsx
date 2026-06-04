import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { Loader2 } from 'lucide-react';
import { SHADOW_BLOCK_BUTTON, SHADOW_GHOST_HOVER } from '@/lib/core/shadows';
import { cn } from '@/lib/core/utils';

/** Shared loading spinner markup for button primitives. */
export function renderButtonChildren(
  loading: boolean,
  spinnerClassName: string,
  children: ReactNode
) {
  if (loading) {
    return (
      <>
        <Loader2 className={cn('shrink-0 animate-spin', spinnerClassName)} aria-hidden />
        <span className="sr-only">Loading</span>
      </>
    );
  }
  return children;
}

// —— Standard Button ————————————————————————————————————————————————————————

export interface ButtonProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'href'>,
    Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel' | 'download'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      href,
      type = 'button',
      disabled,
      loading = false,
      target,
      rel,
      download,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const spinnerClassName = size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-5' : 'size-4';
    const cls = cn(
      'inline-flex items-center justify-center gap-2 text-center font-medium  border-2 border-border transition-all',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:pointer-events-none disabled:opacity-50',
      {
        'bg-primary text-primary-foreground hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 shadow active:shadow-none':
          variant === 'primary',
        'bg-background text-foreground border-border hover:bg-muted': variant === 'secondary',
        'bg-transparent text-foreground border-transparent hover:bg-muted': variant === 'ghost',
        'bg-transparent text-foreground border-border hover:bg-muted': variant === 'outline',
      },
      {
        'h-8 px-3 text-sm': size === 'sm',
        'h-10 px-4 text-sm': size === 'md',
        'h-12 px-6 text-base': size === 'lg',
      },
      className
    );

    if (href) {
      return (
        <a
          ref={ref as Ref<HTMLAnchorElement>}
          href={href}
          data-ss-button-link
          target={target}
          rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
          download={download}
          className={cn(
            cls,
            'no-underline [text-decoration-line:none]',
            variant === 'primary' &&
              '!text-primary-foreground visited:!text-primary-foreground hover:!text-primary-foreground',
            variant === 'secondary' &&
              '!text-foreground visited:!text-foreground hover:!text-foreground',
            variant === 'outline' &&
              '!text-foreground visited:!text-foreground hover:!text-foreground',
            variant === 'ghost' &&
              '!text-foreground visited:!text-foreground hover:!text-foreground'
          )}
          {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {renderButtonChildren(loading, spinnerClassName, children)}
        </a>
      );
    }

    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cls}
        {...props}
      >
        {renderButtonChildren(loading, spinnerClassName, children)}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };

// —— Block shadow button ————————————————————————————————————————————————————

export type BlockShadowButtonVariant = 'primary' | 'secondary' | 'outline';
export type BlockShadowButtonSize = 'sm' | 'md' | 'lg';
export type BlockShadowDepth = 'md' | 'sm';

export type BlockShadowButtonClassOptions = {
  variant?: BlockShadowButtonVariant;
  size?: BlockShadowButtonSize;
  shadow?: BlockShadowDepth;
  fullWidth?: boolean;
  className?: string;
};

export function blockShadowButtonClassNames(options: BlockShadowButtonClassOptions = {}): string {
  const { variant = 'primary', size = 'md', fullWidth = false, className } = options;

  return cn(
    'inline-flex cursor-pointer items-center justify-center gap-2  border-2 border-border font-black uppercase tracking-widest',
    'transition-[transform,box-shadow] duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    SHADOW_BLOCK_BUTTON,
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
    className
  );
}

export type BlockShadowButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> &
  BlockShadowButtonClassOptions & {
    className?: string;
    loading?: boolean;
  };

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
      loading = false,
      children,
      ...props
    },
    ref
  ) => {
    const spinnerClassName = size === 'sm' ? 'size-3.5' : size === 'lg' ? 'size-4' : 'size-3.5';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          blockShadowButtonClassNames({ variant, size, shadow, fullWidth, className }),
          'disabled:pointer-events-none disabled:opacity-50'
        )}
        {...props}
      >
        {renderButtonChildren(loading, spinnerClassName, children)}
      </button>
    );
  }
);

BlockShadowButton.displayName = 'BlockShadowButton';

// —— Ghost outline button ————————————————————————————————————————————————————

export type GhostOutlineButtonSize = 'sm' | 'md' | 'lg';

export type GhostOutlineButtonClassOptions = {
  size?: GhostOutlineButtonSize;
  fullWidth?: boolean;
  className?: string;
};

export function ghostOutlineButtonClassNames(options: GhostOutlineButtonClassOptions = {}): string {
  const { size = 'md', fullWidth = false, className } = options;

  return cn(
    'inline-flex cursor-pointer items-center justify-center gap-2  border-2 border-border bg-card text-foreground',
    'transition-[box-shadow,border-color,color] duration-150 ease-out',
    SHADOW_GHOST_HOVER,
    'active:border-primary focus-visible:outline-none focus-visible:border-primary',
    {
      'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide': size === 'sm',
      'px-5 py-2.5 text-xs font-bold uppercase tracking-wide': size === 'md',
      'px-6 py-4 text-xs font-black uppercase tracking-widest': size === 'lg',
    },
    fullWidth && 'w-full',
    className
  );
}

export type GhostOutlineButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> &
  GhostOutlineButtonClassOptions & {
    className?: string;
    loading?: boolean;
  };

export const GhostOutlineButton = forwardRef<HTMLButtonElement, GhostOutlineButtonProps>(
  (
    {
      size = 'md',
      fullWidth = false,
      className,
      type = 'button',
      disabled,
      loading = false,
      children,
      ...props
    },
    ref
  ) => {
    const spinnerClassName = size === 'lg' ? 'size-4' : 'size-3.5';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          ghostOutlineButtonClassNames({ size, fullWidth, className }),
          'disabled:pointer-events-none disabled:opacity-50'
        )}
        {...props}
      >
        {renderButtonChildren(loading, spinnerClassName, children)}
      </button>
    );
  }
);

GhostOutlineButton.displayName = 'GhostOutlineButton';
