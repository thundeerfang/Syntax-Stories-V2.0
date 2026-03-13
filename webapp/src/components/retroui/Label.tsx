'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block text-[10px] font-bold uppercase text-muted-foreground mb-1.5 cursor-pointer',
        className
      )}
      {...props}
    />
  )
);

Label.displayName = 'Label';
