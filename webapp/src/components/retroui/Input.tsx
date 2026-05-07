'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'w-full rounded-md border-2 border-border bg-background px-3 py-2.5 text-sm font-medium',
        'placeholder:text-muted-foreground/70',
        'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:focus:border-destructive',
        className
      )}
      {...props}
    />
  )
);

Input.displayName = 'Input';
