'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ToggleGroupContextValue {
  type: 'single' | 'multiple';
  value: string | string[];
  onItemClick: (value: string) => void;
  variant?: 'default' | 'outline';
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null);

function useToggleGroup() {
  const ctx = React.useContext(ToggleGroupContext);
  return ctx;
}

export interface ToggleGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  type?: 'single' | 'multiple';
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  variant?: 'default' | 'outline';
}

export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  (
    {
      type = 'single',
      value: controlledValue,
      defaultValue,
      onValueChange,
      variant = 'default',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState<string | string[]>(
      type === 'multiple' ? (defaultValue as string[] ?? []) : (defaultValue as string ?? '')
    );
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : uncontrolledValue;

    const onItemClick = React.useCallback(
      (itemValue: string) => {
        if (type === 'multiple') {
          const arr = (value as string[]) ?? [];
          const next = arr.includes(itemValue) ? arr.filter((v) => v !== itemValue) : [...arr, itemValue];
          if (!isControlled) setUncontrolledValue(next);
          onValueChange?.(next);
        } else {
          const next = value === itemValue ? '' : itemValue;
          if (!isControlled) setUncontrolledValue(next);
          onValueChange?.(next);
        }
      },
      [type, value, isControlled, onValueChange]
    );

    const ctx: ToggleGroupContextValue = { type, value, onItemClick, variant };

    return (
      <ToggleGroupContext.Provider value={ctx}>
        <div
          ref={ref}
          role="group"
          className={cn(
            'inline-flex rounded-md border-2 border-border bg-card p-0.5 shadow-[2px_2px_0px_0px_var(--border)]',
            variant === 'outline' && 'bg-transparent',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    );
  }
);
ToggleGroup.displayName = 'ToggleGroup';

export interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ value, className, onClick, ...props }, ref) => {
    const ctx = useToggleGroup();
    const isActive = ctx
      ? ctx.type === 'multiple'
        ? (ctx.value as string[])?.includes(value)
        : (ctx.value as string) === value
      : false;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      ctx?.onItemClick(value);
      onClick?.(e);
    };

    if (!ctx) {
      return (
        <button ref={ref} type="button" className={cn(className)} onClick={onClick} {...props} />
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        role="button"
        aria-pressed={isActive}
        data-state={isActive ? 'on' : 'off'}
        onClick={handleClick}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded border-0 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          'hover:bg-muted/80',
          ctx.variant === 'outline' && 'bg-transparent hover:bg-muted/50',
          isActive && 'bg-primary text-primary-foreground hover:bg-primary/90',
          className
        )}
        {...props}
      />
    );
  }
);
ToggleGroupItem.displayName = 'ToggleGroupItem';
