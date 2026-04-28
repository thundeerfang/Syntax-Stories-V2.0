'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-md border-2 border-border bg-background px-3 py-2.5 text-sm font-medium resize-none',
        'placeholder:text-muted-foreground/70',
        'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = 'Textarea';
