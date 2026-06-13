'use client';

import type { ReactNode } from 'react';
import { CentricPageHeader, type CentricPageHeaderProps } from './CentricPageHeader';
import type { BreadcrumbItem } from '@/components/ui/AdminBreadcrumb';

export type DashboardPageHeaderProps = {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
};

/** @deprecated Prefer `CentricPageHeader` — this wrapper keeps existing call sites working. */
export function DashboardPageHeader({
  title,
  subtitle,
  description,
  ...rest
}: DashboardPageHeaderProps) {
  return <CentricPageHeader title={title} description={description ?? subtitle} {...rest} />;
}

export { CentricPageHeader };
export type { CentricPageHeaderProps };
