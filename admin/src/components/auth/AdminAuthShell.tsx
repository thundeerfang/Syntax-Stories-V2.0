'use client';

import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { AdminLogo } from '@/components/layout/AdminLogo';

export type AdminAuthShellProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
  maxWidth?: number;
};

/** Centered auth card (use inside `AdminAuthPageLayout` for full-screen gradient). */
export function AdminAuthShell({
  title,
  subtitle,
  icon,
  children,
  maxWidth = 480,
}: AdminAuthShellProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        mx: 'auto',
        width: '100%',
        maxWidth,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2.5,
        overflow: 'hidden',
        boxShadow: (t) => `0 16px 48px ${alpha(t.palette.common.black, 0.1)}`,
      }}
    >
      <Box
        sx={{
          px: { xs: 2.5, sm: 3.5 },
          pt: 3,
          pb: 1.5,
          background: (theme) =>
            `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.07)} 0%, transparent 100%)`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            mb: 2,
          }}
        >
          <AdminLogo href={undefined} variant="horizontal" height={36} />
          <Box
            sx={{
              flexShrink: 0,
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
              bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
              color: 'primary.main',
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography variant="h6" component="p" fontWeight={700} letterSpacing="-0.02em">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 360 }}>
          {subtitle}
        </Typography>
      </Box>
      <Box sx={{ px: { xs: 2.5, sm: 3.5 }, pb: 3, pt: 1 }}>{children}</Box>
    </Paper>
  );
}
