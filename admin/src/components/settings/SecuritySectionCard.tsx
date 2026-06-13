'use client';

import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography, alpha, useTheme } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

export type SecuritySectionCardProps = {
  icon: SvgIconComponent;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
  tone?: 'primary' | 'neutral';
};

export function SecuritySectionCard({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  tone = 'primary',
}: SecuritySectionCardProps) {
  const theme = useTheme();
  const color = tone === 'primary' ? theme.palette.primary.main : theme.palette.text.secondary;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={2}
        sx={{
          px: 2,
          py: 1.75,
          borderBottom: children ? '1px solid' : 'none',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.16 : 0.1),
              color,
            }}
          >
            <Icon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} letterSpacing="-0.01em">
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, lineHeight: 1.5 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
        {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
      </Stack>
      {children ? <Box sx={{ p: 2 }}>{children}</Box> : null}
    </Paper>
  );
}
