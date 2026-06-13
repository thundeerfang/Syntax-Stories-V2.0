'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/core/utils';
import { RectangleAppBreadcrumb, type RectangleAppBreadcrumbItem } from './RectangleAppBreadcrumb';

type ShellPageIntroHeaderProps = Readonly<{
  breadcrumbItems: RectangleAppBreadcrumbItem[];
  title: ReactNode;
  description: string;
  /** Renders on the breadcrumb row, right-aligned on `sm+`. */
  breadcrumbEnd?: ReactNode;
  /** Renders beside title + description; vertically centered with that block on `sm+`, right-aligned. */
  descriptionEnd?: ReactNode;
  className?: string;
}>;

/** Breadcrumb + page title + intro paragraph in one block (stacked). */
export function ShellPageIntroHeader({
  breadcrumbItems,
  title,
  description,
  breadcrumbEnd,
  descriptionEnd,
  className,
}: ShellPageIntroHeaderProps) {
  return (
    <header className={cn('flex w-full flex-col items-start space-y-3 md:space-y-4', className)}>
      <div
        className={cn(
          'flex w-full flex-col gap-3',
          breadcrumbEnd != null && 'sm:flex-row sm:items-center sm:justify-between'
        )}
      >
        <RectangleAppBreadcrumb items={breadcrumbItems} />
        {breadcrumbEnd != null ? (
          <div className="flex w-full shrink-0 justify-end sm:w-auto">{breadcrumbEnd}</div>
        ) : null}
      </div>
      {descriptionEnd != null ? (
        <div className="flex w-full max-w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:gap-8">
          <div className="min-w-0 flex-1 space-y-3 md:space-y-4">
            <div className="min-w-0 max-w-full text-left">{title}</div>
            <p className="max-w-3xl text-left text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {description}
            </p>
          </div>
          <div className="flex w-full shrink-0 justify-center sm:w-auto sm:justify-end">
            {descriptionEnd}
          </div>
        </div>
      ) : (
        <>
          <div className="min-w-0 max-w-full text-left">{title}</div>
          <p className="max-w-3xl text-left text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {description}
          </p>
        </>
      )}
    </header>
  );
}
