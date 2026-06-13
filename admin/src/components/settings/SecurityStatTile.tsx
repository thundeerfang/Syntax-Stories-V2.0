'use client';

import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography, alpha, useTheme } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

export type SecurityStatTileProps = {
  icon: SvgIconComponent;
  label: string;
  value: ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
};

const TONE_KEY = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  neutral: 'text',
} as const;

export function SecurityStatTile({
  icon: Icon,
  label,
  value,
  tone = 'primary',
}: SecurityStatTileProps) {
  const theme = useTheme();
  const paletteKey = TONE_KEY[tone];
  const color =
    paletteKey === 'text'
      ? theme.palette.text.secondary
      : theme.palette[paletteKey].main;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        height: '100%',
        bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.06 : 0.04),
      }}
    >
      <Stack spacing={1}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(color, theme.palette.mode === 'dark' ? 0.14 : 0.1),
            color,
          }}
        >
          <Icon sx={{ fontSize: 20 }} />
        </Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
        <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
          {value}
        </Typography>
      </Stack>
    </Paper>
  );
}
