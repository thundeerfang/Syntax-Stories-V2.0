'use client';

import type { ReactNode } from 'react';
import { Avatar, Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { AdminBreadcrumb, type BreadcrumbItem } from '@/components/ui/AdminBreadcrumb';

export type CentricPageHeaderAvatar = {
  src?: string | null;
  alt?: string;
  /** Shown when the image is missing or fails to load */
  fallbackLetter?: string;
};

export type CentricPageHeaderProps = {
  title: string;
  /** Body copy below the title */
  description?: string;
  /** Icon on the right side of the header (default layout only) */
  icon?: ReactNode;
  /** Rendered immediately beside the header icon circle (e.g. external link) */
  iconAccessory?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  /**
   * Profile layout: breadcrumbs on top, large avatar with title + description stacked beside it.
   * Description sits under the title (not under the decorative icon slot).
   */
  avatar?: CentricPageHeaderAvatar;
};

export function CentricPageHeader({
  title,
  description,
  icon,
  iconAccessory,
  breadcrumbs = [],
  actions,
  avatar,
}: CentricPageHeaderProps) {
  const theme = useTheme();
  const hasBreadcrumbs = breadcrumbs.length > 0;

  if (avatar) {
    const letter = avatar.fallbackLetter?.trim().charAt(0).toUpperCase() || '?';

    return (
      <Stack spacing={2} sx={{ mb: 0.5 }}>
        {hasBreadcrumbs || actions ? (
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={2}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              {hasBreadcrumbs ? <AdminBreadcrumb items={breadcrumbs} /> : null}
            </Box>
            {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
          </Stack>
        ) : null}

        <Stack direction="row" spacing={2.5} alignItems="flex-start">
          <Avatar
            src={avatar.src ?? undefined}
            alt={avatar.alt ?? title}
            sx={{
              width: 72,
              height: 72,
              flexShrink: 0,
              bgcolor: 'primary.main',
              fontSize: '1.75rem',
              fontWeight: 700,
              border: '2px solid',
              borderColor: alpha(theme.palette.primary.main, 0.2),
            }}
          >
            {letter}
          </Avatar>

          <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h4"
              component="h1"
              fontWeight={800}
              letterSpacing="-0.02em"
              sx={{ lineHeight: 1.2 }}
            >
              {title}
            </Typography>
            {description ? (
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                {description}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} sx={{ mb: 0.5 }}>
      {hasBreadcrumbs || actions ? (
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {hasBreadcrumbs ? <AdminBreadcrumb items={breadcrumbs} /> : null}
          </Box>
          {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
        </Stack>
      ) : null}

      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
          <Typography
            variant="h4"
            component="h1"
            fontWeight={800}
            letterSpacing="-0.02em"
            gutterBottom={Boolean(description)}
            sx={{ lineHeight: 1.2 }}
          >
            {title}
          </Typography>
          {description ? (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 720, lineHeight: 1.55 }}
            >
              {description}
            </Typography>
          ) : null}
        </Box>

        {icon || iconAccessory ? (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
            {iconAccessory ?? null}
            {icon ? (
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(
                    theme.palette.primary.main,
                    theme.palette.mode === 'dark' ? 0.18 : 0.1
                  ),
                  color: 'primary.main',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.16),
                }}
              >
                {icon}
              </Box>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Stack>
  );
}
