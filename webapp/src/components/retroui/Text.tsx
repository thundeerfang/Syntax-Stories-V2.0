'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const Text = React.forwardRef<HTMLSpanElement, TextProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('text-[10px] font-bold uppercase text-foreground', className)}
      {...props}
    />
  )
);

Text.displayName = 'Text';
