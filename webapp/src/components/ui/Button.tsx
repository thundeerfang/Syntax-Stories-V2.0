import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type Ref,
} from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'href'>,
    Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel' | 'download'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  /** When set, renders as `<a>` with the same surface styles (e.g. external links). */
  href?: string;
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
      target,
      rel,
      download,
      children,
      ...props
    },
    ref,
  ) => {
    const cls = cn(
      'inline-flex items-center justify-center gap-2 text-center font-medium rounded-none border-2 border-border transition-all',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:pointer-events-none disabled:opacity-50',
      {
        'bg-primary text-primary-foreground hover:opacity-90 active:translate-x-0.5 active:translate-y-0.5 shadow-sm active:shadow-none':
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
      className,
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
            variant === 'secondary' && '!text-foreground visited:!text-foreground hover:!text-foreground',
            variant === 'outline' && '!text-foreground visited:!text-foreground hover:!text-foreground',
            variant === 'ghost' && '!text-foreground visited:!text-foreground hover:!text-foreground',
          )}
          {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </a>
      );
    }

    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled}
        className={cls}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
