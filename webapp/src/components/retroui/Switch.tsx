'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ id, checked, defaultChecked, onCheckedChange, className, ...props }, ref) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultChecked ?? false);
    const isControlled = checked !== undefined;
    const isOn = isControlled ? checked : uncontrolled;

    const handleClick = () => {
      const next = !isOn;
      if (!isControlled) setUncontrolled(next);
      onCheckedChange?.(next);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isOn}
        id={id}
        onClick={handleClick}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-none border-2 border-border bg-muted transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          isOn && 'border-primary bg-primary',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none block h-4 w-4 border-2 border-border bg-background shadow-sm transition-transform',
            isOn ? 'translate-x-[1.375rem]' : 'translate-x-1'
          )}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';
