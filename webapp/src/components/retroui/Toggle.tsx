'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  /** Controlled pressed state */
  pressed?: boolean;
  /** Uncontrolled default */
  defaultPressed?: boolean;
  /** When pressed state changes (controlled use) */
  onPressedChange?: (pressed: boolean) => void;
}

/**
 * Single toggle button with retro neomorphism style.
 * Use for one on/off state, or use two Toggles side-by-side for a two-option switch (e.g. Project | Publication).
 */
export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ pressed: controlledPressed, defaultPressed = false, onPressedChange, className, children, onClick, ...props }, ref) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultPressed);
    const isControlled = controlledPressed !== undefined;
    const pressed = isControlled ? controlledPressed : uncontrolled;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const next = !pressed;
      if (!isControlled) setUncontrolled(next);
      onPressedChange?.(next);
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={pressed}
        data-state={pressed ? 'on' : 'off'}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 border-2 border-border font-bold text-[10px] uppercase tracking-wide transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          'disabled:pointer-events-none disabled:opacity-50',
          // Neomorphism: unpressed = soft raised, pressed = inset / filled
          !pressed &&
            'bg-muted/40 text-muted-foreground shadow-[3px_3px_6px_var(--shadow)] hover:bg-muted/60',
          pressed &&
            'bg-primary text-primary-foreground border-primary shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2)]',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Toggle.displayName = 'Toggle';
