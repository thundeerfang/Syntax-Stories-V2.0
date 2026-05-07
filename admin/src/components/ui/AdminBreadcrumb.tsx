'use client';

import Link from 'next/link';
import { Breadcrumbs, Typography } from '@mui/material';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
};

export function AdminBreadcrumb({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <Breadcrumbs
      separator={<NavigateNextRoundedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
      sx={{ mb: 2 }}
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        if (last || !item.href) {
          return (
            <Typography key={`${item.label}-${i}`} color="text.primary" variant="body2" fontWeight={600}>
              {item.label}
            </Typography>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className="text-inherit no-underline hover:underline"
          >
            <Typography color="text.secondary" variant="body2" fontWeight={500} component="span">
              {item.label}
            </Typography>
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
