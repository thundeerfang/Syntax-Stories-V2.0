'use client';

import type { ComponentType } from 'react';
import { useToastStore } from '@/store/toast';
import { Alert } from '@/components/retroui/Alert';
import { cn } from '@/lib/utils';
import { CheckCircle, Info, X, AlertCircle } from 'lucide-react';

const statusIcons = {
  success: CheckCircle,
  info: Info,
  error: X,
  warning: AlertCircle,
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = statusIcons[t.status];
        return (
          <ToastItem
            key={t.id}
            status={t.status}
            title={t.title}
            onDismiss={() => remove(t.id)}
            Icon={Icon}
          />
        );
      })}
    </div>
  );
}

const retroStatusStyles: Record<string, string> = {
  success: 'border-2 border-border bg-card text-foreground border-green-600 dark:border-green-500',
  info: 'border-2 border-border bg-card text-foreground border-primary',
  error: 'border-2 border-border bg-card text-foreground border-destructive',
  warning: 'border-2 border-border bg-card text-foreground border-amber-600 dark:border-amber-500',
};

function ToastItem({
  status,
  title,
  onDismiss,
  Icon,
}: Readonly<{
  status: 'success' | 'info' | 'error' | 'warning';
  title: string;
  onDismiss: () => void;
  Icon: ComponentType<{ className?: string }>;
}>) {
  return (
    <div className="pointer-events-auto">
      <Alert
        status={status}
        className={cn(
          'relative flex items-center gap-3 pr-10 rounded-none shadow-md bg-card',
          retroStatusStyles[status]
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <Alert.Title className="flex-1 text-xl font-black italic tracking-tighter text-foreground">
          {title}
        </Alert.Title>
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 border-2 border-border hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </Alert>
    </div>
  );
}
