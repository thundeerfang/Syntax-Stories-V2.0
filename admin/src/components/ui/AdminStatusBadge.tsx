'use client';

import type { ReactNode } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';

export type AdminStatusBadgeTone =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'primary'
  | 'neutral';

export type AdminStatusBadgeProps = {
  label: string;
  tone?: AdminStatusBadgeTone;
  /** Stronger fill, border, and soft glow — for important / positive states. */
  emphasis?: boolean;
  icon?: ReactNode;
};

function resolveToneColor(
  tone: AdminStatusBadgeTone,
  palette: ReturnType<typeof useTheme>['palette']
): string {
  switch (tone) {
    case 'success':
      return palette.success.main;
    case 'warning':
      return palette.warning.main;
    case 'error':
      return palette.error.main;
    case 'info':
      return palette.info.main;
    case 'primary':
      return palette.primary.main;
    case 'neutral':
    default:
      return palette.text.secondary;
  }
}

export function AdminStatusBadge({
  label,
  tone = 'neutral',
  emphasis = false,
  icon,
}: AdminStatusBadgeProps) {
  const theme = useTheme();
  const color = resolveToneColor(tone, theme.palette);
  const isDark = theme.palette.mode === 'dark';

  const bgAlpha = emphasis ? (isDark ? 0.16 : 0.1) : isDark ? 0.12 : 0.08;
  const borderAlpha = emphasis ? (isDark ? 0.42 : 0.34) : isDark ? 0.28 : 0.22;
  const ringAlpha = emphasis ? (isDark ? 0.22 : 0.16) : 0;

  return (
    <Box
      component="span"
      className="admin-status-badge"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: 999,
        border: '1px solid',
        borderColor: alpha(color, borderAlpha),
        bgcolor: alpha(color, bgAlpha),
        color: emphasis ? color : 'text.primary',
        // Thin border-only highlight — no wide blur spread.
        boxShadow: emphasis ? `0 0 0 1px ${alpha(color, ringAlpha)}` : 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        '& .admin-status-badge__icon': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          fontSize: 16,
          lineHeight: 0,
          '& svg': { fontSize: 16 },
        },
      }}
    >
      {icon ? <Box className="admin-status-badge__icon">{icon}</Box> : null}
      <Typography
        component="span"
        variant="caption"
        sx={{
          fontWeight: emphasis ? 700 : 600,
          letterSpacing: '0.01em',
          lineHeight: 1.2,
          color: 'inherit',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
