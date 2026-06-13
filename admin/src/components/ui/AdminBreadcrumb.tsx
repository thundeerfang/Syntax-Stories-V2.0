'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Breadcrumbs, Typography } from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';

export type BreadcrumbItem = {
  label: string;
  href?: string;
  /** Render a home icon instead of text (links to `/` when `href` is set). */
  home?: boolean;
  icon?: ReactNode;
};

type Props = {
  items: BreadcrumbItem[];
};

function CrumbContent({ item, muted }: { item: BreadcrumbItem; muted?: boolean }) {
  if (item.home) {
    return (
      <HomeRoundedIcon
        sx={{
          fontSize: 20,
          color: muted ? 'text.secondary' : 'text.primary',
          display: 'block',
        }}
        aria-hidden
      />
    );
  }
  if (item.icon) {
    return (
      <Typography
        component="span"
        color={muted ? 'text.secondary' : 'text.primary'}
        variant="body2"
        fontWeight={muted ? 500 : 600}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
      >
        {item.icon}
        {item.label}
      </Typography>
    );
  }
  return (
    <Typography
      color={muted ? 'text.secondary' : 'text.primary'}
      variant="body2"
      fontWeight={muted ? 500 : 600}
      component="span"
    >
      {item.label}
    </Typography>
  );
}

export function AdminBreadcrumb({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <Breadcrumbs
      separator={<NavigateNextRoundedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
      sx={{ mb: 0 }}
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        const key = item.href ?? `${item.label}-${i}`;

        if (last || !item.href) {
          return (
            <span key={key} aria-current={last ? 'page' : undefined}>
              <CrumbContent item={item} muted={!last} />
            </span>
          );
        }

        return (
          <Link
            key={key}
            href={item.href}
            aria-label={item.home ? 'Home' : item.label}
            className="text-inherit no-underline hover:opacity-80"
            style={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <CrumbContent item={item} muted />
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
