'use client';

import { createContext, useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AlertStatus = 'success' | 'info' | 'error' | 'warning';

const statusStyles: Record<AlertStatus, string> = {
  success: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300',
  info: 'border-primary/50 bg-primary/10 text-primary',
  error: 'border-destructive/50 bg-destructive/10 text-destructive',
  warning: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300',
};

const AlertContext = createContext<{ status: AlertStatus } | null>(null);

export interface AlertProps {
  status: AlertStatus;
  className?: string;
  children: ReactNode;
}

export function Alert({ status, className, children }: Readonly<AlertProps>) {
  const contextValue = useMemo(() => ({ status }), [status]);
  return (
    <AlertContext.Provider value={contextValue}>
      <div
        role="alert"
        className={cn(
          'rounded-lg border-2 p-4',
          statusStyles[status],
          className
        )}
      >
        {children}
      </div>
    </AlertContext.Provider>
  );
}

export function AlertTitle({ className, ...props }: Readonly<React.HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn('font-semibold', className)}
      {...props}
    />
  );
}

Alert.Title = AlertTitle;
